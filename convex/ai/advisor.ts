"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import OpenAI from "openai";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";

const ADVISOR_SYSTEM_PROMPT = `You are an expert interior designer providing actionable recommendations to improve a room.
You have been given a detailed analysis of a room photo and the user's style profile from a discovery quiz.

The user's style profile includes:
- **Primary/Secondary Style**: The overall aesthetic direction (e.g., modern, scandinavian, bohemian)
- **Emotional Vibe**: What feeling the room should evoke (serenity, energy, cozy, order)
- **Decor Density**: How much "stuff" the user wants (purist/minimal, curator/balanced, collector/abundant)
- **Color & Pattern Threshold**: Comfort level with patterns (neutral/solid, natural/organic, bold/patterned)
- **Color Palette**: Specific colors they prefer
- **Design Priorities**: Specific preferences derived from the quiz

YOUR PRIMARY DIRECTIVE: Every recommendation MUST be explicitly tied to and described in terms of the user's style profile.

Generate specific, practical recommendations that:
1. **ARE DESCRIBED USING THE USER'S STYLE LANGUAGE** - Use their primary style as an adjective (e.g., "modern minimalist shelf", "cozy bohemian throw", "industrial metal rack")
2. **EXPLICITLY STATE STYLE ALIGNMENT** - In reasoning, always mention how it fits their style, vibe, and preferences
3. Use ONLY colors from their preferred color palette
4. Respect the user's budget constraints
5. Address identified issues in the room analysis
6. Are easy to understand and implement

CRITICAL STYLE CONSTRAINTS:
- **Emotional Vibe:**
  - "serenity" or "order" → clean, uncluttered, calming solutions
  - "energy" → bold colors, statement pieces, creative stimulation
  - "cozy" → warmth, soft textures, layering, inviting materials

- **Decor Density:**
  - "purist" → MINIMAL additions, clear surfaces, one key piece per recommendation
  - "curator" → thoughtful, well-styled pieces, balanced composition
  - "collector" → embrace layering, collections, gallery walls, abundant styling

- **Color & Pattern:**
  - "neutral" → solids only, subtle textures like linen or matte finishes
  - "natural" → wood grain, stone, organic materials, earth tones
  - "bold" → patterns welcome (geometric, floral, stripes), vibrant colors encouraged

VISUALIZATION PROMPTS:
- ALWAYS start with "In [USER'S PRIMARY STYLE] style:"
- Include specific style descriptors (e.g., "Scandinavian light oak", "industrial brushed steel", "modern matte black")
- Reference colors from their palette by name
- Describe materials and finishes that match the style (e.g., "natural linen texture", "smooth ceramic with geometric pattern")
- End with "Keep everything else in the room identical to the original photo."

EXAMPLES OF STYLE-SPECIFIC LANGUAGE:
- Modern: "sleek", "geometric", "monochromatic", "matte black", "chrome accents"
- Scandinavian: "light wood", "cozy textiles", "neutral palette", "functional beauty", "hygge"
- Bohemian: "layered textures", "global patterns", "macramé", "rattan", "eclectic mix"
- Industrial: "exposed", "raw materials", "metal and wood", "Edison bulbs", "urban edge"
- Traditional: "tufted", "ornate", "rich wood", "classic silhouette", "timeless elegance"

Respond with valid JSON only.`;

const QUICK_WINS_PROMPT = `Generate 5-7 "quick win" recommendations organized by effort level:

**SUPER QUICK WINS (0-2 items, $0 cost):**
- Moving/rearranging existing furniture for better flow
- Decluttering or reorganizing existing items
- Repurposing items already in the room
- These require NO purchases, just rearrangement

**QUICK WINS (3-5 items, under $200 each):**
- Accessories, textiles, lighting, plants, organization, artwork
- Small paint projects (accent walls, furniture painting, trim)
- DIY or easy installation
- Noticeable improvement

IMPORTANT STYLE ALIGNMENT:
- EVERY recommendation must explicitly reference and align with the user's style profile
- Use the exact style language from their preferences (e.g., "modern minimalist", "cozy bohemian")
- Reference their emotional vibe in the reasoning (e.g., "to create the serene atmosphere you prefer")
- Respect their decor density preference (purist = minimal additions, collector = embrace layering)
- Only suggest patterns/bold colors if their color pattern preference allows it

The room has multiple photos (indexed 0, 1, 2...). For each recommendation, specify "suggestedPhotoIndex" — the index of the photo that best shows the area this recommendation targets.

Response format:
{
  "items": [
    {
      "id": "unique-id",
      "title": "Short title (reference style if relevant, e.g., 'Minimalist Wall Art')",
      "description": "What to do and how, WITH EXPLICIT STYLE REFERENCES",
      "category": "decor|lighting|textiles|plants|organization|artwork|rearrangement|paint",
      "estimatedCost": {"min": 0, "max": 200, "currency": "USD"},
      "impact": "high|medium|low",
      "difficulty": "diy|easy_install|professional",
      "reasoning": "Why this helps based on the analysis AND how it aligns with their [specific style] preferences and [emotional vibe] goals",
      "visualizationPrompt": "IN [USER'S PRIMARY STYLE] STYLE: Describe the specific change, mentioning style elements (e.g., 'modern minimalist floating shelf', 'cozy bohemian throw pillows'). Keep everything else in the room identical.",
      "suggestedPhotoIndex": 0
    }
  ],
  "summary": "Brief overview emphasizing style alignment"
}`;

const TRANSFORMATIONS_PROMPT = `Generate 3-5 "transformation" recommendations:
- Budget: $200-2000 each
- Effort: May require professional help or significant DIY
- Impact: Significant room improvement
- Types: Furniture pieces, light fixtures, layout changes, wall painting (full walls/rooms), flooring, built-ins

PAINTING OPTIONS TO CONSIDER:
- Full wall paint in colors matching their style palette
- Accent walls to create focal points
- Painting existing furniture to refresh it in their style
- Trim, molding, or ceiling paint
- Two-tone walls or color blocking (if their pattern preference allows)

IMPORTANT STYLE ALIGNMENT:
- EVERY recommendation must be deeply rooted in the user's style profile
- Use style-specific vocabulary (e.g., "Scandinavian light wood", "industrial metal and glass", "traditional tufted")
- Suggest colors ONLY from their preferred palette
- Reference their emotional vibe in the reasoning
- Match their decor density (purist = statement pieces only, collector = allow for display/storage furniture)
- Respect their pattern comfort level

The room has multiple photos (indexed 0, 1, 2...). For each recommendation, specify "suggestedPhotoIndex" — the index of the photo that best shows the area this recommendation targets.

Response format:
{
  "items": [
    {
      "id": "unique-id",
      "title": "Style-specific title (e.g., 'Scandinavian Oak Console Table', 'Industrial Edison Pendant')",
      "description": "What to do and how, with SPECIFIC STYLE REFERENCES and materials/finishes that match their aesthetic",
      "category": "furniture|fixtures|paint|flooring|layout",
      "estimatedCost": {"min": 200, "max": 2000, "currency": "USD"},
      "impact": "high|medium|low",
      "difficulty": "diy|easy_install|professional",
      "reasoning": "Detailed explanation of how this transformation supports their [specific style], achieves their [emotional vibe], and respects their [decor density] preference",
      "visualizationPrompt": "IN [USER'S PRIMARY STYLE] STYLE: Describe the transformation with style-specific details (materials, colors from their palette, design language). Example: 'modern minimalist white oak floating credenza with brass handles' or 'warm sage green accent wall in a soft matte finish'. Keep everything else in the room identical.",
      "suggestedPhotoIndex": 0
    }
  ],
  "summary": "Brief overview emphasizing transformative impact and style cohesion"
}`;

const CUSTOM_QUESTION_PROMPT = `Generate a SINGLE, specific recommendation that directly answers the user's question.

The user has asked a custom question about improving their room. Provide ONE focused recommendation that:
- Directly addresses their specific question
- Aligns with their style profile (this is CRITICAL)
- Is practical and actionable
- Includes a clear budget estimate
- Can be visualized

IMPORTANT STYLE ALIGNMENT:
- Use their primary style as the foundation for your answer
- Reference their emotional vibe and how this recommendation supports it
- Only suggest colors from their preferred palette
- Respect their decor density preference
- Match their pattern comfort level

Response format (single recommendation):
{
  "items": [
    {
      "id": "custom-answer",
      "title": "Style-specific title answering their question (e.g., 'Scandinavian Wool Rug in Sage Green')",
      "description": "Detailed answer to their question with specific product/action recommendations",
      "category": "decor|lighting|textiles|plants|organization|artwork|rearrangement|paint|furniture|fixtures|flooring|layout",
      "estimatedCost": {"min": 0, "max": 2000, "currency": "USD"},
      "impact": "high|medium|low",
      "difficulty": "diy|easy_install|professional",
      "reasoning": "Why this specifically answers their question AND aligns with their [style] aesthetic, [emotional vibe] goals, and [decor density] preference",
      "visualizationPrompt": "IN [USER'S PRIMARY STYLE] STYLE: Describe the specific change that answers their question, using style-appropriate materials and colors from their palette. Keep everything else in the room identical.",
      "suggestedPhotoIndex": 0
    }
  ],
  "summary": "One sentence summarizing how this recommendation answers their question"
}`;

export const generateRecommendations = internalAction({
  args: {
    roomId: v.id("rooms"),
    analysisId: v.id("analyses"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
    recommendationId: v.id("recommendations"),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("advisor", {
      roomId: args.roomId,
      tier: args.tier,
      recommendationId: args.recommendationId,
    });

    logger.info("Starting recommendation generation");

    try {
      const analysis = await ctx.runQuery(internal.analyses.get, { id: args.analysisId });
      if (!analysis || !analysis.results) {
        logger.error("Analysis not found or incomplete");
        throw new Error("Analysis not found or incomplete");
      }

      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      if (!room) {
        throw new Error("Room not found");
      }

      const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
      const context = buildContext(analysis.results, room, project);
      const tierPrompt = args.tier === "quick_wins" ? QUICK_WINS_PROMPT : TRANSFORMATIONS_PROMPT;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      logger.info("Calling OpenAI for recommendations");

      // Wrap OpenAI call in retry logic to handle transient failures
      const response = await withRetry(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: ADVISOR_SYSTEM_PROMPT },
            { role: "user", content: context + "\n\n" + tierPrompt },
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

      const recommendations = JSON.parse(content);
      logger.info("Parsed recommendations", {
        itemCount: recommendations.items?.length || 0,
      });

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

      logger.info("Recommendations saved successfully");
    } catch (error) {
      logger.error("Recommendation generation failed", error);
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
    const primaryStyle = project.styleProfile.primaryStyle;
    const secondaryStyle = project.styleProfile.secondaryStyle;
    const styleDescriptor = secondaryStyle
      ? `${primaryStyle} with ${secondaryStyle} influences`
      : primaryStyle;

    context += `\n
## ⭐ USER STYLE PROFILE (CRITICAL - USE THIS IN EVERY RECOMMENDATION)
**Overall Aesthetic:** ${styleDescriptor.toUpperCase()}
- Primary Style: ${primaryStyle}`;
    if (secondaryStyle) {
      context += `\n- Secondary Style: ${secondaryStyle}`;
    }
    if (project.styleProfile.colorPreferences.length > 0) {
      context += `\n- **Preferred Colors (USE THESE)**: ${project.styleProfile.colorPreferences.join(", ")}`;
    }
    if (project.styleProfile.priorities.length > 0) {
      context += `\n- **Design Priorities**: ${project.styleProfile.priorities.join(", ")}`;
    }

    // Add detailed guidance for recommendations based on style profile
    context += `\n
## 🎯 MANDATORY STYLE INTEGRATION RULES
1. **Every recommendation title** must include the style as an adjective (e.g., "${primaryStyle} coffee table", "${primaryStyle} wall art")
2. **Every reasoning** must explicitly mention how it aligns with their ${primaryStyle} aesthetic
3. **Every visualization prompt** must start with "In ${primaryStyle} style:"
4. **Only use colors** from this list: ${project.styleProfile.colorPreferences.slice(0, 5).join(", ")}
5. **Style vocabulary** - Use words that evoke ${primaryStyle} design:`;

    // Add style-specific vocabulary hints
    const styleVocabulary: Record<string, string> = {
      modern: "sleek, minimal, geometric, clean lines, monochromatic, contemporary",
      scandinavian: "light wood, cozy, hygge, functional, natural materials, soft textiles",
      industrial: "raw, exposed, metal, concrete, urban, vintage, Edison lighting",
      traditional: "classic, ornate, rich wood, tufted, timeless, elegant",
      bohemian: "eclectic, layered, global, patterns, textured, artistic, colorful",
      minimalist: "essential, uncluttered, simple, purposeful, calm, neutral",
      coastal: "breezy, relaxed, natural, beach-inspired, light, airy",
      "mid-century": "retro, organic shapes, tapered legs, warm wood, functional",
      eclectic: "mixed, curated, unique, personal, creative, bold",
      maximalist: "abundant, rich, layered, bold, pattern-mixing, expressive",
      farmhouse: "rustic, weathered, cozy, homey, shiplap, vintage charm",
    };

    const vocabHint = styleVocabulary[primaryStyle] || "style-appropriate";
    context += ` ${vocabHint}`;
  }

  if (project?.budget) {
    const remaining = project.budget.total - project.budget.spent;
    context += `\n
## Budget
- Remaining: ${project.budget.currency} ${remaining}`;
  }

  return context;
}

export const answerCustomQuestion = internalAction({
  args: {
    roomId: v.id("rooms"),
    analysisId: v.id("analyses"),
    recommendationId: v.id("recommendations"),
    userQuestion: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const analysis = await ctx.runQuery(internal.analyses.get, { id: args.analysisId });
      if (!analysis || !analysis.results) {
        throw new Error("Analysis not found or incomplete");
      }

      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      if (!room) {
        throw new Error("Room not found");
      }

      const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
      const context = buildContext(analysis.results, room, project);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const userPrompt = `## USER'S QUESTION
"${args.userQuestion}"

Please provide ONE specific recommendation that answers this question.

${CUSTOM_QUESTION_PROMPT}

${context}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ADVISOR_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
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
            id: item.id || `custom-${index}`,
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
      console.error("Custom question answering failed:", error);
      await ctx.runMutation(internal.recommendations.fail, {
        id: args.recommendationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

