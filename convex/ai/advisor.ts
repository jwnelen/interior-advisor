"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import OpenAI from "openai";

const ADVISOR_SYSTEM_PROMPT = `You are an expert interior designer providing actionable recommendations to improve a room.
You have been given an analysis of a room photo and user preferences/constraints.

Generate specific, practical recommendations that:
1. Respect the user's budget and constraints
2. Build on the existing style or transition to their preferred style
3. Address identified issues in the room
4. Are easy to understand and implement

Each recommendation must include a visualization prompt that can be used with an image generation model to show how the change would look.
The visualization prompt must describe ONLY the specific changes for that recommendation and explicitly say to keep the rest of the room identical.

Respond with valid JSON only.`;

const QUICK_WINS_PROMPT = `Generate 3-5 "quick win" recommendations:
- Budget: Under $200 each
- Effort: DIY or easy installation
- Impact: Noticeable improvement
- Types: Accessories, textiles, lighting, plants, organization, artwork

The room has multiple photos (indexed 0, 1, 2...). For each recommendation, specify "suggestedPhotoIndex" — the index of the photo that best shows the area this recommendation targets. Use the photo descriptions from the analysis to pick the most relevant photo. If unsure, use 0.

Response format:
{
  "items": [
    {
      "id": "unique-id",
      "title": "Short title",
      "description": "What to do and how",
      "category": "decor|lighting|textiles|plants|organization|artwork",
      "estimatedCost": {"min": 0, "max": 200, "currency": "USD"},
      "impact": "high|medium|low",
      "difficulty": "diy|easy_install|professional",
      "reasoning": "Why this helps based on the analysis",
      "visualizationPrompt": "Describe ONLY the change. Explicitly say to keep everything else in the room identical.",
      "suggestedPhotoIndex": 0
    }
  ],
  "summary": "Brief overview of the recommendations"
}`;

const TRANSFORMATIONS_PROMPT = `Generate 2-4 "transformation" recommendations:
- Budget: $200-2000 each
- Effort: May require professional help
- Impact: Significant room improvement
- Types: Furniture pieces, light fixtures, layout changes, paint, flooring

The room has multiple photos (indexed 0, 1, 2...). For each recommendation, specify "suggestedPhotoIndex" — the index of the photo that best shows the area this recommendation targets. Use the photo descriptions from the analysis to pick the most relevant photo. If unsure, use 0.

Response format:
{
  "items": [
    {
      "id": "unique-id",
      "title": "Short title",
      "description": "What to do and how",
      "category": "furniture|fixtures|paint|flooring|layout",
      "estimatedCost": {"min": 200, "max": 2000, "currency": "USD"},
      "impact": "high|medium|low",
      "difficulty": "diy|easy_install|professional",
      "reasoning": "Why this helps based on the analysis",
      "visualizationPrompt": "Describe ONLY the change. Explicitly say to keep everything else in the room identical.",
      "suggestedPhotoIndex": 0
    }
  ],
  "summary": "Brief overview of the recommendations"
}`;

export const generateRecommendations = internalAction({
  args: {
    roomId: v.id("rooms"),
    analysisId: v.id("analyses"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
    recommendationId: v.id("recommendations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get analysis results
      const analysis = await ctx.runQuery(internal.analyses.get, { id: args.analysisId });
      if (!analysis || !analysis.results) {
        throw new Error("Analysis not found or incomplete");
      }

      // Get room details
      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      if (!room) {
        throw new Error("Room not found");
      }

      // Get project for constraints and style
      const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });

      // Build context
      const context = buildContext(analysis.results, room, project);
      const tierPrompt = args.tier === "quick_wins" ? QUICK_WINS_PROMPT : TRANSFORMATIONS_PROMPT;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ADVISOR_SYSTEM_PROMPT },
          { role: "user", content: context + "\n\n" + tierPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const recommendations = JSON.parse(content);

      // Map suggestedPhotoIndex to actual storage IDs
      const photos = room.photos ?? [];
      await ctx.runMutation(internal.recommendations.save, {
        id: args.recommendationId,
        items: recommendations.items.map((item: Record<string, unknown>, index: number) => {
          const photoIndex = typeof item.suggestedPhotoIndex === "number" ? item.suggestedPhotoIndex : 0;
          const suggestedPhoto = photos[photoIndex] ?? photos[0];
          return {
            id: item.id || `${args.tier}-${index}`,
            title: item.title,
            description: item.description,
            category: item.category,
            estimatedCost: item.estimatedCost,
            impact: item.impact,
            difficulty: item.difficulty,
            reasoning: item.reasoning,
            visualizationPrompt: item.visualizationPrompt,
            suggestedPhotoStorageId: suggestedPhoto?.storageId,
          };
        }),
        summary: recommendations.summary,
      });
    } catch (error) {
      console.error("Recommendation generation failed:", error);
      await ctx.runMutation(internal.recommendations.fail, {
        id: args.recommendationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

interface AnalysisResults {
  furniture: Array<{ item: string; location: string; condition: string; style: string }>;
  lighting: { natural: string; artificial: string[]; assessment: string };
  colors: { dominant: string[]; accents: string[]; palette: string };
  layout: { flow: string; focalPoint?: string; issues: string[] };
  style: { detected: string; confidence: number; elements: string[] };
  photoDescriptions?: string[];
}

interface Room {
  name: string;
  type: string;
  photos: { storageId: string; url: string; uploadedAt: number }[];
  dimensions?: { width: number; length: number; height?: number; unit: string };
  notes?: string;
}

interface Project {
  styleProfile?: {
    primaryStyle: string;
    secondaryStyle?: string;
    colorPreferences: string[];
    priorities: string[];
  };
  budget?: { total: number; spent: number; currency: string };
  constraints?: {
    rentalFriendly: boolean;
    petFriendly: boolean;
    childFriendly: boolean;
    mobilityAccessible: boolean;
  };
}

function buildContext(
  analysis: AnalysisResults,
  room: Room,
  project: Project | null
): string {
  let context = `## Room Analysis
${JSON.stringify(analysis, null, 2)}

## Room Details
- Name: ${room.name}
- Type: ${room.type}
- Number of photos: ${room.photos.length}`;

  if (analysis.photoDescriptions && analysis.photoDescriptions.length > 0) {
    context += `\n\n## Photo Descriptions`;
    analysis.photoDescriptions.forEach((desc: string, i: number) => {
      context += `\n- Photo ${i}: ${desc}`;
    });
  }

  if (room.dimensions) {
    context += `\n- Dimensions: ${room.dimensions.width}x${room.dimensions.length} ${room.dimensions.unit}`;
  }

  if (room.notes) {
    context += `\n- Notes: ${room.notes}`;
  }

  if (project?.styleProfile) {
    context += `\n
## User Style Preferences
- Primary Style: ${project.styleProfile.primaryStyle}`;
    if (project.styleProfile.secondaryStyle) {
      context += `\n- Secondary Style: ${project.styleProfile.secondaryStyle}`;
    }
    if (project.styleProfile.colorPreferences.length > 0) {
      context += `\n- Color Preferences: ${project.styleProfile.colorPreferences.join(", ")}`;
    }
    if (project.styleProfile.priorities.length > 0) {
      context += `\n- Priorities: ${project.styleProfile.priorities.join(", ")}`;
    }
  }

  if (project?.budget) {
    const remaining = project.budget.total - project.budget.spent;
    context += `\n
## Budget
- Remaining: ${project.budget.currency} ${remaining}`;
  }

  if (project?.constraints) {
    context += `\n
## Constraints`;
    if (project.constraints.rentalFriendly) {
      context += "\n- Rental Friendly: Yes - no permanent modifications allowed";
    }
    if (project.constraints.petFriendly) {
      context += "\n- Pet Friendly: Yes - durable, easy-clean materials preferred";
    }
    if (project.constraints.childFriendly) {
      context += "\n- Child Friendly: Yes - safe designs, rounded edges preferred";
    }
    if (project.constraints.mobilityAccessible) {
      context += "\n- Mobility Accessible: Yes - consider accessibility needs";
    }
  }

  return context;
}
