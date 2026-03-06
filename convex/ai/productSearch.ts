"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";

// Categories that map to purchasable products
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
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
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

  return query || category;
}

export const searchProductsForRecommendations = internalAction({
  args: {
    recommendationId: v.id("recommendations"),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("productSearch", {
      recommendationId: args.recommendationId,
    });

    const serpApiKey = process.env.SERP_API_KEY;
    if (!serpApiKey) {
      logger.error("SERP_API_KEY not configured, skipping product search");
      return;
    }

    const recommendation = await ctx.runQuery(internal.recommendations.getById, {
      id: args.recommendationId,
    });

    if (!recommendation || recommendation.status !== "completed") {
      logger.error("Recommendation not found or not completed");
      return;
    }

    logger.info("Starting product search", {
      itemCount: recommendation.items.length,
    });

    await ctx.runMutation(internal.recommendations.updateSuggestedProducts, {
      id: args.recommendationId,
      itemUpdates: [],
      productSearchStatus: "searching",
    });

    const itemUpdates: Array<{ itemId: string; suggestedProduct: { name: string; price: string; imageUrl: string; productUrl: string; storeName: string; fetchedAt: number } }> = [];

    for (const item of recommendation.items) {
      if (!SEARCHABLE_CATEGORIES.has(item.category)) {
        logger.info("Skipping non-searchable category", {
          itemId: item.id,
          category: item.category,
        });
        continue;
      }

      const query = buildSearchQuery(item.title, item.category);
      logger.info("Searching for item", { itemId: item.id, query });

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

        // Take the first result that has both a product URL and thumbnail
        const result = shoppingResults.find((r) => {
          return (r.product_link || r.link) && r.thumbnail;
        });

        if (result) {
          const productUrl = result.product_link ?? result.link ?? "";
          const imageUrl = result.thumbnail ?? "";
          const price = result.price ?? "";
          const storeName = result.source ?? "Store";

          if (productUrl && imageUrl) {
            itemUpdates.push({
              itemId: item.id,
              suggestedProduct: {
                name: result.title,
                price,
                imageUrl,
                productUrl,
                storeName,
                fetchedAt: Date.now(),
              },
            });
            logger.info("Found product", { itemId: item.id, name: result.title, storeName });
          }
        } else {
          logger.info("No result found for item", { itemId: item.id, query });
        }
      } catch (error) {
        logger.error("SerpAPI search failed for item", { itemId: item.id, error });
        // Continue to next item rather than failing the whole batch
      }
    }

    await ctx.runMutation(internal.recommendations.updateSuggestedProducts, {
      id: args.recommendationId,
      itemUpdates,
      productSearchStatus: "completed",
    });

    logger.info("Product search completed", {
      found: itemUpdates.length,
      total: recommendation.items.length,
    });
  },
});
