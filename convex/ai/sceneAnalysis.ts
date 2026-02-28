"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import OpenAI from "openai";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";
import { estimateOpenAICostUsd, normalizeOpenAITokenUsage } from "../lib/apiCost";

const SCENE_ANALYSIS_SYSTEM_PROMPT = `You are an expert interior designer analyzing room photographs. You may receive multiple photos of the same room from different angles. Combine observations from all provided images into a single comprehensive analysis.

Provide detailed, structured analysis of:
- Furniture items (type, style, condition, placement)
- Lighting (natural light sources, artificial fixtures, overall assessment)
- Color palette (dominant colors, accents, warmth/coolness)
- Room layout (traffic flow, focal points, problem areas)
- Overall style (detected style, confidence, supporting elements)
- Per-photo descriptions (a short description of what each photo shows, used to match recommendations to specific photos later)

You must respond with valid JSON matching this exact structure:
{
  "furniture": [
    {"item": "string", "location": "string", "condition": "good|fair|poor", "style": "string"}
  ],
  "lighting": {
    "natural": "abundant|moderate|limited",
    "artificial": ["list of fixtures"],
    "assessment": "string description"
  },
  "colors": {
    "dominant": ["hex or color names"],
    "accents": ["hex or color names"],
    "palette": "warm|cool|neutral"
  },
  "layout": {
    "flow": "string description",
    "focalPoint": "string or null",
    "issues": ["list of issues"]
  },
  "style": {
    "detected": "modern|scandinavian|industrial|traditional|bohemian|minimalist|coastal|mid-century|transitional|eclectic",
    "confidence": 0.0-1.0,
    "elements": ["list of style elements"]
  },
  "photoDescriptions": ["short description of what photo 0 shows", "short description of what photo 1 shows"]
}`;

function buildSceneAnalysisUserPrompt(styleProfile?: { primaryStyle: string; secondaryStyle?: string; emotionalVibe?: string } | null): string {
  let prompt = `Analyze these room photographs and provide a detailed assessment combining observations from all provided images. The images show the same room from different angles. Focus on:
1. What furniture is present and its current condition/style (cross-reference across photos)
2. How is the lighting (natural and artificial)
3. What colors dominate the space
4. How does the layout work (or not work)
5. What interior design style best describes this room
6. For each photo (in order), provide a short description of what area/angle it shows`;

  if (styleProfile) {
    prompt += `\n\nIMPORTANT CONTEXT: The user's desired style is "${styleProfile.primaryStyle}"${styleProfile.secondaryStyle ? ` with ${styleProfile.secondaryStyle} influences` : ""}.${styleProfile.emotionalVibe ? ` They want the room to feel "${styleProfile.emotionalVibe}".` : ""} In your analysis, note any elements that conflict with or already support their desired style. Include this in the layout issues and style elements.`;
  }

  prompt += `\n\nRespond with JSON only.`;
  return prompt;
}

export const analyze = internalAction({
  args: {
    roomId: v.id("rooms"),
    photoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const model = "gpt-4o";
    let openAiCallCompleted = false;
    let usage = normalizeOpenAITokenUsage(null);
    let estimatedCostUsd = 0;

    const logger = createLogger("sceneAnalysis", {
      roomId: args.roomId,
      photoCount: args.photoStorageIds.length,
    });

    logger.info("Starting scene analysis");

    const analysisId = await ctx.runMutation(internal.analyses.create, {
      roomId: args.roomId,
      photoStorageIds: args.photoStorageIds,
    });

    logger.info("Analysis record created", { analysisId });

    try {
      await ctx.runMutation(internal.analyses.updateStatus, {
        id: analysisId,
        status: "processing",
      });

      const imageUrls: string[] = [];
      for (const storageId of args.photoStorageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) imageUrls.push(url);
      }
      if (imageUrls.length === 0) {
        logger.error("Failed to get any image URLs");
        throw new Error("Failed to get any image URLs");
      }

      logger.info("Retrieved image URLs", { urlCount: imageUrls.length });

      // Fetch the room's project to get style profile for context
      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      let styleProfile: { primaryStyle: string; secondaryStyle?: string; emotionalVibe?: string } | null = null;
      if (room) {
        const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
        if (project?.styleProfile) {
          styleProfile = project.styleProfile;
        }
      }

      const contentParts: Array<
        | { type: "image_url"; image_url: { url: string; detail: "high" | "auto" } }
        | { type: "text"; text: string }
      > = [];

      imageUrls.forEach((url, index) => {
        contentParts.push({
          type: "image_url",
          image_url: { url, detail: index === 0 ? "high" : "auto" },
        });
      });

      contentParts.push({
        type: "text",
        text: buildSceneAnalysisUserPrompt(styleProfile),
      });

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      logger.info("Calling OpenAI GPT-4o for scene analysis");

      // Wrap OpenAI call in retry logic to handle transient failures
      const response = await withRetry(
        () => openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SCENE_ANALYSIS_SYSTEM_PROMPT },
            { role: "user", content: contentParts },
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
        }),
        { maxRetries: 3, baseDelay: 1000, maxDelay: 8000 }
      );

      const content = response.choices[0].message.content;
      if (!content) {
        logger.error("No response from OpenAI");
        throw new Error("No response from OpenAI");
      }

      logger.info("Received OpenAI response", {
        contentLength: content.length,
        tokensUsed: response.usage?.total_tokens,
      });

      openAiCallCompleted = true;
      usage = normalizeOpenAITokenUsage(response.usage);
      estimatedCostUsd = estimateOpenAICostUsd(model, usage);

      const results = JSON.parse(content);

      await ctx.runMutation(internal.analyses.complete, {
        id: analysisId,
        results: {
          furniture: results.furniture || [],
          lighting: results.lighting || { natural: "moderate", artificial: [], assessment: "Unable to assess" },
          colors: results.colors || { dominant: [], accents: [], palette: "neutral" },
          layout: results.layout || { flow: "Unable to assess", issues: [] },
          style: results.style || { detected: "transitional", confidence: 0.5, elements: [] },
          rawAnalysis: content,
        },
      });

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "openai",
          model,
          operation: "scene_analysis",
          status: "success",
          estimatedCostUsd,
          units: 1,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          roomId: args.roomId,
        });
      } catch (trackingError) {
        logger.warn("Failed to track API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }

      logger.info("Scene analysis completed successfully");
    } catch (error) {
      logger.error("Scene analysis failed", error, { analysisId });
      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "openai",
          model,
          operation: "scene_analysis",
          status: "failed",
          estimatedCostUsd: openAiCallCompleted ? estimatedCostUsd : 0,
          units: 1,
          inputTokens: openAiCallCompleted ? usage.inputTokens : undefined,
          outputTokens: openAiCallCompleted ? usage.outputTokens : undefined,
          totalTokens: openAiCallCompleted ? usage.totalTokens : undefined,
          roomId: args.roomId,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (trackingError) {
        logger.warn("Failed to track failed API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }
      await ctx.runMutation(internal.analyses.fail, {
        id: analysisId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
