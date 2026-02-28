"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { GoogleGenAI } from "@google/genai";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";
import { estimateGeminiImageCostUsd } from "../lib/apiCost";

interface StyleProfile {
  primaryStyle: string;
  secondaryStyle?: string;
  colorPreferences: string[];
  emotionalVibe?: string;
  decorDensity?: string;
  colorPattern?: string;
}

function buildInteriorPrompt(userPrompt: string, styleProfile?: StyleProfile | null): string {
  const parts = [
    "Photorealistic interior photo of the provided room",
  ];

  if (styleProfile) {
    const styleParts: string[] = [];
    styleParts.push(`${styleProfile.primaryStyle} interior design style`);
    if (styleProfile.secondaryStyle) {
      styleParts.push(`with ${styleProfile.secondaryStyle} influences`);
    }
    if (styleProfile.emotionalVibe) {
      const vibeDescriptions: Record<string, string> = {
        serenity: "serene and calming atmosphere",
        energy: "energetic and vibrant atmosphere",
        cozy: "warm and cozy atmosphere",
        order: "clean and orderly atmosphere",
      };
      styleParts.push(vibeDescriptions[styleProfile.emotionalVibe] || "");
    }
    if (styleProfile.colorPreferences.length > 0) {
      styleParts.push(`color palette: ${styleProfile.colorPreferences.slice(0, 4).join(", ")}`);
    }
    if (styleProfile.decorDensity) {
      const densityDescriptions: Record<string, string> = {
        purist: "minimal decor with clean surfaces",
        curator: "thoughtfully curated decor",
        collector: "richly layered decor and accessories",
      };
      styleParts.push(densityDescriptions[styleProfile.decorDensity] || "");
    }
    parts.push(styleParts.filter(Boolean).join(", "));
  }

  parts.push(
    "Keep the layout, architecture, camera angle, lighting, materials, and colors unchanged unless explicitly specified",
    `Apply only these changes: ${userPrompt}`,
    "Do not add, remove, or move other objects",
    "Professional real estate photography, natural lighting, highly detailed",
  );

  return parts.join(", ");
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/png";
  return { data, mimeType };
}

export const generateVisualization = internalAction({
  args: {
    visualizationId: v.id("visualizations"),
    roomId: v.id("rooms"),
    originalPhotoId: v.id("_storage"),
    prompt: v.string(),
    type: v.string(),
    controlNetMode: v.string(),
    strength: v.number(),
    ikeaProductImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = "gemini-3.1-flash-image-preview";
    let apiCalled = false;
    let estimatedCostUsd = 0;

    const logger = createLogger("imageGeneration", {
      visualizationId: args.visualizationId,
      roomId: args.roomId,
      type: args.type,
    });

    try {
      logger.info("Starting image generation");

      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      // Fetch style profile from the room's project
      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      let styleProfile: StyleProfile | null = null;
      if (room) {
        const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
        if (project?.styleProfile) {
          styleProfile = project.styleProfile;
        }
      }

      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) {
        logger.error("Failed to get original image URL");
        throw new Error("Failed to get original image URL");
      }

      logger.info("Retrieved original image URL");

      // Fetch original room photo as base64
      const roomImage = await fetchImageAsBase64(originalUrl);

      // Build prompt parts: text + room image + optional product image
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: buildInteriorPrompt(args.prompt, styleProfile) },
        {
          inlineData: {
            mimeType: roomImage.mimeType,
            data: roomImage.data,
          },
        },
      ];

      // Add IKEA product image if provided
      if (args.ikeaProductImageUrl) {
        const productImage = await fetchImageAsBase64(args.ikeaProductImageUrl);
        parts.push({
          inlineData: {
            mimeType: productImage.mimeType,
            data: productImage.data,
          },
        });
        logger.info("Added IKEA product image to prompt");
      }

      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("Google Gemini API key not configured");
        throw new Error("Google Gemini API key (GOOGLE_GEMINI_API_KEY) is not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      logger.info("Calling Gemini API", { model });

      const response = await withRetry(
        () =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        { maxRetries: 3, baseDelay: 2000, maxDelay: 16000 }
      );
      apiCalled = true;
      estimatedCostUsd = estimateGeminiImageCostUsd(model, 1);

      logger.info("Received Gemini response");

      // Extract generated image from response
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error("No content in Gemini response");
      }

      let imageData: string | null = null;
      let imageMimeType = "image/png";

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data ?? null;
          imageMimeType = part.inlineData.mimeType ?? "image/png";
          break;
        }
      }

      if (!imageData) {
        throw new Error("No image data in Gemini response");
      }

      // Convert base64 to blob and store
      const imageBuffer = Buffer.from(imageData, "base64");
      const blob = new Blob([imageBuffer], { type: imageMimeType });
      const storageId = await ctx.storage.store(blob);

      logger.info("Image stored successfully", { storageId });

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        logger.error("Failed to get storage URL for generated image");
        throw new Error("Failed to get storage URL for generated image");
      }

      await ctx.runMutation(internal.visualizations.complete, {
        id: args.visualizationId,
        storageId,
        url,
      });

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "google",
          model,
          operation: "visualization",
          status: "success",
          estimatedCostUsd,
          units: 1,
          roomId: args.roomId,
        });
      } catch (trackingError) {
        logger.warn("Failed to track API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }

      logger.info("Visualization generation completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Image generation failed", error);

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "google",
          model,
          operation: "visualization",
          status: "failed",
          estimatedCostUsd: apiCalled ? estimatedCostUsd : 0,
          units: 1,
          roomId: args.roomId,
          errorMessage,
        });
      } catch (trackingError) {
        logger.warn("Failed to track failed API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }

      try {
        await ctx.runMutation(internal.visualizations.fail, {
          id: args.visualizationId,
          error: errorMessage || "Unknown error occurred during generation",
        });
      } catch (failError) {
        console.error(`Failed to record failure status:`, failError);
      }
    }
  },
});
