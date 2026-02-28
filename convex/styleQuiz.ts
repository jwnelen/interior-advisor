import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUserId } from "./auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("styleQuizResponses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const save = mutation({
  args: {
    emotionalVibe: v.optional(v.string()),
    visualAnchor: v.optional(v.string()),
    decorDensity: v.optional(v.string()),
    colorPattern: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const existing = await ctx.db
      .query("styleQuizResponses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Calculate style profile
    const calculatedStyle = calculateStyle({
      emotionalVibe: args.emotionalVibe || "order",
      visualAnchor: args.visualAnchor || "modern",
      decorDensity: args.decorDensity || "curator",
      colorPattern: args.colorPattern || "neutral",
    });

    const styleProfile = buildStyleProfile(calculatedStyle);

    let responseId: string;

    if (existing) {
      await ctx.db.patch(existing._id, {
        emotionalVibe: args.emotionalVibe,
        visualAnchor: args.visualAnchor,
        decorDensity: args.decorDensity,
        colorPattern: args.colorPattern,
        calculatedStyle,
        completedAt: Date.now(),
      });
      responseId = existing._id;
    } else {
      responseId = await ctx.db.insert("styleQuizResponses", {
        userId,
        emotionalVibe: args.emotionalVibe,
        visualAnchor: args.visualAnchor,
        decorDensity: args.decorDensity,
        colorPattern: args.colorPattern,
        calculatedStyle,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    }

    // Apply style profile to all user projects
    await applyStyleProfileToProjects(ctx, userId, styleProfile);

    return responseId;
  },
});

// ============================================================================
// STYLE CALCULATION
// ============================================================================

interface QuizResponses {
  emotionalVibe: string;
  visualAnchor: string;
  decorDensity: string;
  colorPattern: string;
}

interface CalculatedStyle {
  primaryStyle: string;
  secondaryStyle?: string;
  description: string;
  emotionalVibe: string;
  decorDensity: string;
  colorPattern: string;
}

interface StyleProfile {
  primaryStyle: string;
  secondaryStyle?: string;
  colorPreferences: string[];
  priorities: string[];
  emotionalVibe: string;
  decorDensity: string;
  colorPattern: string;
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: "Clean lines, neutral colors, and functional design define your taste. You appreciate simplicity with purpose.",
  scandinavian: "Light, airy spaces with natural materials and cozy textiles. You value hygge and functional beauty.",
  industrial: "Raw materials, exposed elements, and urban aesthetics. You're drawn to authenticity and character.",
  traditional: "Classic elegance, rich colors, and timeless furniture. You appreciate heritage and craftsmanship.",
  bohemian: "Eclectic patterns, global influences, and artistic expression. You celebrate individuality and creativity.",
  minimalist: "You believe less is more, with each item serving a clear purpose. Clarity and calm are essential.",
  coastal: "Relaxed, breezy vibes with natural textures. You're drawn to the serenity of beach-inspired living.",
  "mid-century": "Retro charm with organic shapes and functional beauty. You love the timeless appeal of mid-20th century design.",
  eclectic: "You mix and match styles fearlessly, creating unique spaces that tell your story.",
  maximalist: "More is more! You embrace bold colors, patterns, and abundant decor with confidence.",
  farmhouse: "Rustic charm with modern comfort. You love the warmth of lived-in, homey spaces.",
};

function calculateStyle(responses: QuizResponses): CalculatedStyle {
  const { emotionalVibe, visualAnchor, decorDensity, colorPattern } = responses;

  // Primary style comes from Visual Anchor
  let primaryStyle = visualAnchor;

  // Refine based on other answers
  const styleModifiers: string[] = [];

  // Emotional Vibe influences
  if (emotionalVibe === "serenity") {
    if (visualAnchor === "modern") primaryStyle = "minimalist";
    else if (visualAnchor === "traditional") primaryStyle = "coastal";
    styleModifiers.push("scandinavian", "minimalist");
  } else if (emotionalVibe === "energy") {
    styleModifiers.push("eclectic", "maximalist");
  } else if (emotionalVibe === "cozy") {
    if (visualAnchor === "modern") primaryStyle = "scandinavian";
    styleModifiers.push("farmhouse", "bohemian");
  } else if (emotionalVibe === "order") {
    if (visualAnchor !== "modern") primaryStyle = "modern";
    styleModifiers.push("minimalist", "modern");
  }

  // Decor Density influences
  if (decorDensity === "purist") {
    if (visualAnchor !== "minimalist") primaryStyle = "minimalist";
    styleModifiers.push("minimalist", "scandinavian");
  } else if (decorDensity === "collector") {
    styleModifiers.push("bohemian", "eclectic", "maximalist");
  } else {
    styleModifiers.push("mid-century", "modern");
  }

  // Color & Pattern influences
  if (colorPattern === "neutral") {
    styleModifiers.push("minimalist", "scandinavian");
  } else if (colorPattern === "natural") {
    styleModifiers.push("scandinavian", "coastal", "farmhouse");
  } else if (colorPattern === "bold") {
    styleModifiers.push("eclectic", "maximalist", "bohemian");
  }

  // Count style modifier frequencies to determine secondary style
  const styleCounts: Record<string, number> = {};
  styleModifiers.forEach((style) => {
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });

  // Get secondary style (most common modifier that's different from primary)
  const sortedModifiers = Object.entries(styleCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([style]) => style);
  const secondaryStyle = sortedModifiers.find((style) => style !== primaryStyle);

  const description = STYLE_DESCRIPTIONS[primaryStyle] || "A unique blend of styles that reflects your personality.";

  return {
    primaryStyle,
    secondaryStyle,
    description,
    emotionalVibe,
    decorDensity,
    colorPattern,
  };
}

function buildStyleProfile(calculatedStyle: CalculatedStyle): StyleProfile {
  const colorPreferences = deriveColorPreferences(
    calculatedStyle.primaryStyle,
    calculatedStyle.secondaryStyle
  );
  const priorities = derivePriorities(calculatedStyle);

  return {
    primaryStyle: calculatedStyle.primaryStyle,
    secondaryStyle: calculatedStyle.secondaryStyle,
    colorPreferences,
    priorities,
    emotionalVibe: calculatedStyle.emotionalVibe,
    decorDensity: calculatedStyle.decorDensity,
    colorPattern: calculatedStyle.colorPattern,
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
  "mid-century": ["teak", "olive green", "burnt orange"],
  eclectic: ["jewel tones", "mixed metals", "vibrant accents"],
  maximalist: ["rich burgundy", "emerald", "gold accents"],
  farmhouse: ["weathered white", "barn wood", "sage"],
};

function deriveColorPreferences(
  primaryStyle: string,
  secondaryStyle: string | undefined
): string[] {
  const palettes = new Set<string>();

  const addPalette = (style: string | undefined) => {
    if (style && STYLE_COLOR_PALETTES[style]) {
      STYLE_COLOR_PALETTES[style].forEach((color) => palettes.add(color));
    }
  };

  addPalette(primaryStyle);
  addPalette(secondaryStyle);

  if (palettes.size === 0) {
    STYLE_COLOR_PALETTES.modern.forEach((color) => palettes.add(color));
  }

  return Array.from(palettes);
}

function derivePriorities(calculatedStyle: CalculatedStyle): string[] {
  const priorities: string[] = [];

  // Emotional Vibe priorities
  if (calculatedStyle.emotionalVibe === "serenity") {
    priorities.push("Calming atmosphere", "Soft lighting");
  } else if (calculatedStyle.emotionalVibe === "energy") {
    priorities.push("Bold statement pieces", "Creative expression");
  } else if (calculatedStyle.emotionalVibe === "cozy") {
    priorities.push("Warmth and comfort", "Inviting textures");
  } else if (calculatedStyle.emotionalVibe === "order") {
    priorities.push("Organization and clarity", "Clean lines");
  }

  // Decor Density priorities
  if (calculatedStyle.decorDensity === "purist") {
    priorities.push("Minimal clutter", "Clear surfaces");
  } else if (calculatedStyle.decorDensity === "curator") {
    priorities.push("Thoughtful styling", "Balanced composition");
  } else if (calculatedStyle.decorDensity === "collector") {
    priorities.push("Personal collections", "Rich layering");
  }

  // Color & Pattern priorities
  if (calculatedStyle.colorPattern === "neutral") {
    priorities.push("Subtle textures", "Neutral palette");
  } else if (calculatedStyle.colorPattern === "natural") {
    priorities.push("Natural materials", "Organic textures");
  } else if (calculatedStyle.colorPattern === "bold") {
    priorities.push("Pattern mixing", "Bold color accents");
  }

  return priorities.slice(0, 4); // Return top 4 priorities
}

async function applyStyleProfileToProjects(
  ctx: MutationCtx,
  userId: string,
  styleProfile: StyleProfile
) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const project of projects) {
    await ctx.db.patch(project._id, {
      styleProfile,
      updatedAt: Date.now(),
    });
  }
}
