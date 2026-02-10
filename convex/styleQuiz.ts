import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("styleQuizResponses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

export const save = mutation({
  args: {
    sessionId: v.string(),
    responses: v.array(v.object({
      questionId: v.string(),
      selectedOption: v.string(),
    })),
    moodBoardSelections: v.array(v.string()),
    preferences: v.object({
      comfort: v.number(),
      aesthetics: v.number(),
      minimal: v.number(),
      cozy: v.number(),
      modern: v.number(),
      traditional: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if there's an existing response
    const existing = await ctx.db
      .query("styleQuizResponses")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // Calculate style based on responses
    const calculatedStyle = calculateStyle(
      args.responses,
      args.preferences,
      args.moodBoardSelections
    );
    const styleProfile = buildStyleProfile(
      calculatedStyle,
      args.preferences,
      args.moodBoardSelections
    );

    let responseId: string;

    if (existing) {
      await ctx.db.patch(existing._id, {
        responses: args.responses,
        moodBoardSelections: args.moodBoardSelections,
        preferences: args.preferences,
        calculatedStyle,
        completedAt: Date.now(),
      });
      responseId = existing._id;
    } else {
      responseId = await ctx.db.insert("styleQuizResponses", {
        sessionId: args.sessionId,
        responses: args.responses,
        moodBoardSelections: args.moodBoardSelections,
        preferences: args.preferences,
        calculatedStyle,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    }

    await applyStyleProfileToProjects(ctx, args.sessionId, styleProfile);

    return responseId;
  },
});

interface QuizResponse {
  questionId: string;
  selectedOption: string;
}

interface Preferences {
  comfort: number;
  aesthetics: number;
  minimal: number;
  cozy: number;
  modern: number;
  traditional: number;
}

interface CalculatedStyle {
  primaryStyle: string;
  secondaryStyle?: string;
  description: string;
}

interface StyleProfile {
  primaryStyle: string;
  secondaryStyle?: string;
  colorPreferences: string[];
  priorities: string[];
}

function calculateStyle(
  responses: QuizResponse[],
  preferences: Preferences,
  moodBoardSelections: string[]
): CalculatedStyle {
  // Style scoring based on preferences
  const styleScores: Record<string, number> = {
    modern: preferences.modern + (100 - preferences.traditional) + preferences.minimal,
    scandinavian: preferences.minimal + preferences.modern + preferences.cozy,
    industrial: preferences.modern + (100 - preferences.cozy) + preferences.aesthetics,
    traditional: preferences.traditional + preferences.comfort + (100 - preferences.minimal),
    bohemian: preferences.cozy + preferences.aesthetics + (100 - preferences.minimal),
    minimalist: preferences.minimal * 2 + preferences.modern,
    coastal: preferences.cozy + preferences.comfort + (100 - preferences.modern) / 2,
    midcentury: preferences.modern + preferences.aesthetics + preferences.cozy / 2,
  };

  // Add scores from quiz responses
  responses.forEach((response) => {
    const style = response.selectedOption.toLowerCase();
    if (styleScores[style] !== undefined) {
      styleScores[style] += 50;
    }
  });

  moodBoardSelections.forEach((style) => {
    if (styleScores[style] !== undefined) {
      styleScores[style] += 30;
    }
  });

  // Find top two styles
  const sortedStyles = Object.entries(styleScores)
    .sort(([, a], [, b]) => b - a);

  const primaryStyle = sortedStyles[0][0];
  const secondaryStyle = sortedStyles[1]?.[0];

  const descriptions: Record<string, string> = {
    modern: "Clean lines, neutral colors, and functional design define your taste",
    scandinavian: "You prefer light, airy spaces with natural materials and cozy textiles",
    industrial: "Raw materials, exposed elements, and urban aesthetics appeal to you",
    traditional: "Classic elegance, rich colors, and timeless furniture suit your style",
    bohemian: "Eclectic patterns, global influences, and artistic expression inspire you",
    minimalist: "You believe less is more, with each item serving a purpose",
    coastal: "Relaxed, breezy vibes with natural textures make you feel at home",
    midcentury: "Retro charm with organic shapes and functional beauty defines your space",
  };

  return {
    primaryStyle,
    secondaryStyle: secondaryStyle !== primaryStyle ? secondaryStyle : undefined,
    description: descriptions[primaryStyle] || "A unique blend of styles that reflects your personality",
  };
}

function buildStyleProfile(
  calculatedStyle: CalculatedStyle,
  preferences: Preferences,
  moodBoardSelections: string[]
): StyleProfile {
  const colorPreferences = deriveColorPreferences(
    calculatedStyle.primaryStyle,
    calculatedStyle.secondaryStyle,
    moodBoardSelections
  );
  const priorities = derivePriorities(preferences);

  return {
    primaryStyle: calculatedStyle.primaryStyle,
    secondaryStyle: calculatedStyle.secondaryStyle,
    colorPreferences,
    priorities,
  };
}

const STYLE_COLOR_PALETTES: Record<string, string[]> = {
  modern: ["charcoal gray", "soft white", "walnut wood"],
  scandinavian: ["warm oak", "soft white", "sage green"],
  industrial: ["graphite", "brushed metal", "weathered wood"],
  traditional: ["rich mahogany", "cream", "navy blue"],
  bohemian: ["terracotta", "mustard yellow", "emerald green"],
  minimalist: ["crisp white", "light gray", "natural wood"],
  coastal: ["seafoam", "light sand", "ocean blue"],
  midcentury: ["teak", "olive green", "burnt orange"],
};

function deriveColorPreferences(
  primaryStyle: string,
  secondaryStyle: string | undefined,
  moodBoardSelections: string[]
): string[] {
  const palettes = new Set<string>();

  const addPalette = (style: string | undefined) => {
    if (style && STYLE_COLOR_PALETTES[style]) {
      STYLE_COLOR_PALETTES[style].forEach((color) => palettes.add(color));
    }
  };

  addPalette(primaryStyle);
  addPalette(secondaryStyle);

  moodBoardSelections.forEach((style) => addPalette(style));

  if (palettes.size === 0) {
    STYLE_COLOR_PALETTES.modern.forEach((color) => palettes.add(color));
  }

  return Array.from(palettes);
}

function derivePriorities(preferences: Preferences): string[] {
  const priorityEntries: Array<{ label: string; score: number }> = [
    { label: "Comfort-first layout", score: preferences.comfort },
    { label: "Statement decor", score: preferences.aesthetics },
    { label: "Clutter-free styling", score: preferences.minimal },
    { label: "Cozy atmosphere", score: preferences.cozy },
    { label: "Modern influences", score: preferences.modern },
    { label: "Classic influences", score: preferences.traditional },
  ];

  const sorted = priorityEntries
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score >= 50)
    .map((entry) => entry.label);

  if (sorted.length === 0) {
    return ["Balanced comfort and style"];
  }

  return sorted.slice(0, 4);
}

async function applyStyleProfileToProjects(
  ctx: MutationCtx,
  sessionId: string,
  styleProfile: StyleProfile
) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();

  for (const project of projects) {
    await ctx.db.patch(project._id, {
      styleProfile,
      updatedAt: Date.now(),
    });
  }
}
