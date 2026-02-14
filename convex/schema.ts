import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User projects - container for a design endeavor
  projects: defineTable({
    sessionId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    budget: v.optional(v.object({
      total: v.number(),
      spent: v.number(),
      currency: v.string(),
    })),
    styleProfile: v.optional(v.object({
      primaryStyle: v.string(),
      secondaryStyle: v.optional(v.string()),
      colorPreferences: v.array(v.string()),
      priorities: v.array(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"]),

  // Individual rooms within a project
  rooms: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    type: v.string(),
    photos: v.array(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      isPrimary: v.optional(v.boolean()),
      uploadedAt: v.number(),
    })),
    dimensions: v.optional(v.object({
      width: v.number(),
      length: v.number(),
      height: v.optional(v.number()),
      unit: v.string(),
    })),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"]),

  // VLM scene analysis results
  analyses: defineTable({
    roomId: v.id("rooms"),
    photoStorageId: v.optional(v.id("_storage")),
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    results: v.optional(v.object({
      furniture: v.array(v.object({
        item: v.string(),
        location: v.string(),
        condition: v.string(),
        style: v.string(),
      })),
      lighting: v.object({
        natural: v.string(),
        artificial: v.array(v.string()),
        assessment: v.string(),
      }),
      colors: v.object({
        dominant: v.array(v.string()),
        accents: v.array(v.string()),
        palette: v.string(),
      }),
      layout: v.object({
        flow: v.string(),
        focalPoint: v.optional(v.string()),
        issues: v.array(v.string()),
      }),
      style: v.object({
        detected: v.string(),
        confidence: v.number(),
        elements: v.array(v.string()),
      }),
      rawAnalysis: v.string(),
    })),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_status", ["status"]),

  // LLM-generated recommendations
  recommendations: defineTable({
    roomId: v.id("rooms"),
    analysisId: v.id("analyses"),
    tier: v.union(
      v.literal("quick_wins"),
      v.literal("transformations")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    items: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.string(),
      estimatedCost: v.object({
        min: v.number(),
        max: v.number(),
        currency: v.string(),
      }),
      impact: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      difficulty: v.union(
        v.literal("diy"),
        v.literal("easy_install"),
        v.literal("professional")
      ),
      reasoning: v.string(),
      visualizationPrompt: v.optional(v.string()),
      suggestedPhotoStorageId: v.optional(v.id("_storage")),
      selected: v.optional(v.boolean()),
    })),
    summary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_tier", ["roomId", "tier"]),

  // Generated visualization images
  visualizations: defineTable({
    roomId: v.id("rooms"),
    recommendationId: v.optional(v.id("recommendations")),
    originalPhotoId: v.id("_storage"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    type: v.union(
      v.literal("full_render"),
      v.literal("item_change"),
      v.literal("color_change"),
      v.literal("style_transfer")
    ),
    input: v.object({
      prompt: v.string(),
      negativePrompt: v.optional(v.string()),
      controlNetMode: v.string(),
      strength: v.number(),
      seed: v.optional(v.number()),
    }),
    output: v.optional(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      replicateId: v.optional(v.string()),
    })),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_status", ["status"])
    .index("by_recommendation", ["recommendationId"]),

  // Style quiz responses for discovery
  styleQuizResponses: defineTable({
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
    calculatedStyle: v.optional(v.object({
      primaryStyle: v.string(),
      secondaryStyle: v.optional(v.string()),
      description: v.string(),
    })),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"]),
});
