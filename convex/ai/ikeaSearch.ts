"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";

// Categories that map to purchasable IKEA products
const SEARCHABLE_CATEGORIES = new Set([
  "furniture",
  "decor",
  "lighting",
  "textiles",
  "fixtures",
  "flooring",
  "organization",
  "plants",
  "artwork",
]);

interface SerpApiShoppingResult {
  title: string;
  price?: string;
  thumbnail?: string;
  link?: string;
  product_link?: string;
  source?: string;
  serpapi_product_api?: string;
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
}

interface SerpApiProductResponse {
  sellers_results?: {
    online_sellers?: Array<{
      name?: string;
      link?: string;
      price?: string;
    }>;
  };
}

async function resolveIkeaUrl(result: SerpApiShoppingResult, serpApiKey: string): Promise<string | null> {
  // Check direct links first
  if (result.product_link?.includes("ikea.com")) return result.product_link;
  if (result.link?.includes("ikea.com")) return result.link;

  // Fall back to fetching the SerpAPI product details to get real seller URLs
  if (!result.serpapi_product_api) return null;

  try {
    const productUrl = new URL(result.serpapi_product_api);
    productUrl.searchParams.set("api_key", serpApiKey);

    const res = await fetch(productUrl.toString());
    if (!res.ok) return null;

    const data = await res.json() as SerpApiProductResponse;
    const sellers = data.sellers_results?.online_sellers ?? [];

    const ikeaSeller = sellers.find(
      (s) => s.link?.includes("ikea.com") || s.name?.toLowerCase().includes("ikea")
    );

    return ikeaSeller?.link?.includes("ikea.com") ? ikeaSeller.link : null;
  } catch {
    return null;
  }
}

function buildSearchQuery(title: string, category: string): string {
  // Strip common style adjectives to get a cleaner product search
  const styleAdjectives = [
    "modern", "minimalist", "scandinavian", "industrial", "traditional",
    "bohemian", "coastal", "mid-century", "eclectic", "farmhouse",
    "maximalist", "contemporary", "rustic", "vintage", "elegant",
    "sleek", "cozy", "warm", "cool", "bright", "dark", "light",
  ];

  let query = title.toLowerCase();
  for (const adj of styleAdjectives) {
    query = query.replace(new RegExp(`\\b${adj}\\b`, "gi"), "").trim();
  }
  // Normalize whitespace
  query = query.replace(/\s+/g, " ").trim();

  return `IKEA ${query || category}`;
}

export const searchIkeaForRecommendations = internalAction({
  args: {
    recommendationId: v.id("recommendations"),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("ikeaSearch", {
      recommendationId: args.recommendationId,
    });

    const serpApiKey = process.env.SERP_API_KEY;
    if (!serpApiKey) {
      logger.error("SERP_API_KEY not configured, skipping IKEA search");
      return;
    }

    const recommendation = await ctx.runQuery(internal.recommendations.getById, {
      id: args.recommendationId,
    });

    if (!recommendation || recommendation.status !== "completed") {
      logger.error("Recommendation not found or not completed");
      return;
    }

    logger.info("Starting IKEA product search", {
      itemCount: recommendation.items.length,
    });

    await ctx.runMutation(internal.recommendations.updateIkeaProducts, {
      id: args.recommendationId,
      itemUpdates: [],
      ikeaSearchStatus: "searching",
    });

    const itemUpdates: Array<{ itemId: string; ikeaProduct: { name: string; price: string; imageUrl: string; productUrl: string; fetchedAt: number } }> = [];

    for (const item of recommendation.items) {
      if (!SEARCHABLE_CATEGORIES.has(item.category)) {
        logger.info("Skipping non-searchable category", {
          itemId: item.id,
          category: item.category,
        });
        continue;
      }

      const query = buildSearchQuery(item.title, item.category);
      logger.info("Searching IKEA for item", { itemId: item.id, query });

      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google_shopping");
        url.searchParams.set("q", query);
        url.searchParams.set("api_key", serpApiKey);
        url.searchParams.set("num", "10");

        const response = await withRetry(
          () => fetch(url.toString()).then(async (res) => {
            if (!res.ok) throw new Error(`SerpAPI returned ${res.status}`);
            return res.json() as Promise<SerpApiResponse>;
          }),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        );

        const shoppingResults = response.shopping_results ?? [];

        // Find the first result that links to ikea.com
        // In SerpAPI Google Shopping: `link` is a Google URL, `product_link` is the direct retailer URL
        const ikeaResult = shoppingResults.find((r) => {
          const directLink = r.product_link ?? "";
          const googleLink = r.link ?? "";
          const source = r.source ?? "";
          return directLink.includes("ikea.com") || googleLink.includes("ikea.com") || source.toLowerCase().includes("ikea");
        });

        if (ikeaResult) {
          const productUrl = await resolveIkeaUrl(ikeaResult, serpApiKey);
          const imageUrl = ikeaResult.thumbnail ?? "";
          const price = ikeaResult.price ?? "";

          if (productUrl && imageUrl) {
            itemUpdates.push({
              itemId: item.id,
              ikeaProduct: {
                name: ikeaResult.title,
                price,
                imageUrl,
                productUrl,
                fetchedAt: Date.now(),
              },
            });
            logger.info("Found IKEA product", { itemId: item.id, name: ikeaResult.title, productUrl });
          } else {
            logger.info("Could not resolve IKEA URL for item", { itemId: item.id });
          }
        } else {
          logger.info("No IKEA result found for item", { itemId: item.id, query });
        }
      } catch (error) {
        logger.error("SerpAPI search failed for item", { itemId: item.id, error });
        // Continue to next item rather than failing the whole batch
      }
    }

    await ctx.runMutation(internal.recommendations.updateIkeaProducts, {
      id: args.recommendationId,
      itemUpdates,
      ikeaSearchStatus: "completed",
    });

    logger.info("IKEA product search completed", {
      found: itemUpdates.length,
      total: recommendation.items.length,
    });
  },
});
