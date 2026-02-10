"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import OpenAI from "openai";

const SCENE_ANALYSIS_SYSTEM_PROMPT = `You are an expert interior designer analyzing room photographs. Provide detailed, structured analysis of:
- Furniture items (type, style, condition, placement)
- Lighting (natural light sources, artificial fixtures, overall assessment)
- Color palette (dominant colors, accents, warmth/coolness)
- Room layout (traffic flow, focal points, problem areas)
- Overall style (detected style, confidence, supporting elements)

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
  }
}`;

const SCENE_ANALYSIS_USER_PROMPT = `Analyze this room photograph and provide a detailed assessment. Focus on:
1. What furniture is present and its current condition/style
2. How is the lighting (natural and artificial)
3. What colors dominate the space
4. How does the layout work (or not work)
5. What interior design style best describes this room

Respond with JSON only.`;

export const analyze = internalAction({
  args: {
    roomId: v.id("rooms"),
    photoStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Create analysis record
    const analysisId = await ctx.runMutation(internal.analyses.create, {
      roomId: args.roomId,
      photoStorageId: args.photoStorageId,
    });

    try {
      await ctx.runMutation(internal.analyses.updateStatus, {
        id: analysisId,
        status: "processing",
      });

      const imageUrl = await ctx.storage.getUrl(args.photoStorageId);
      if (!imageUrl) {
        throw new Error("Failed to get image URL");
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: SCENE_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
              { type: "text", text: SCENE_ANALYSIS_USER_PROMPT },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

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
    } catch (error) {
      console.error("Scene analysis failed:", error);
      await ctx.runMutation(internal.analyses.fail, {
        id: analysisId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
