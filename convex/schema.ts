import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User projects - container for a design endeavor
  projects: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()), // legacy: kept for backward compat with old anonymous sessions
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
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
      emotionalVibe: v.optional(v.string()),
      decorDensity: v.optional(v.string()),
      colorPattern: v.optional(v.string()),
    })),
    constraints: v.optional(v.object({
      rentalFriendly: v.boolean(),
      petFriendly: v.boolean(),
      childFriendly: v.boolean(),
      mobilityAccessible: v.boolean(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

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
      v.literal("transformations"),
      v.literal("custom_question")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    // For custom questions
    userQuestion: v.optional(v.string()),
    items: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.string(), // decor|lighting|textiles|plants|organization|artwork|rearrangement|paint|furniture|fixtures|flooring|layout
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
      ikeaProduct: v.optional(v.object({
        name: v.string(),
        price: v.string(),
        imageUrl: v.string(),
        productUrl: v.string(),
        fetchedAt: v.number(),
      })),
    })),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    ikeaSearchStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("completed"),
      v.literal("failed"),
    )),
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
      ikeaProduct: v.optional(v.object({
        name: v.string(),
        price: v.string(),
        imageUrl: v.string(),
        productUrl: v.string(),
      })),
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

  // API usage and estimated cost tracking
  apiUsageEvents: defineTable({
    userId: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    roomId: v.optional(v.id("rooms")),
    provider: v.union(v.literal("openai"), v.literal("replicate")),
    model: v.string(),
    operation: v.union(
      v.literal("scene_analysis"),
      v.literal("recommendations"),
      v.literal("custom_question"),
      v.literal("visualization")
    ),
    status: v.union(v.literal("success"), v.literal("failed")),
    estimatedCostUsd: v.number(),
    units: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_project_createdAt", ["projectId", "createdAt"])
    .index("by_room_createdAt", ["roomId", "createdAt"])
    .index("by_operation_createdAt", ["operation", "createdAt"]),

  // Style quiz responses for discovery
  styleQuizResponses: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()), // legacy: kept for backward compat
    emotionalVibe: v.optional(v.string()), // serenity | energy | cozy | order
    visualAnchor: v.optional(v.string()), // modern | traditional | bohemian | industrial
    decorDensity: v.optional(v.string()), // purist | curator | collector
    colorPattern: v.optional(v.string()), // neutral | natural | bold
    calculatedStyle: v.optional(v.object({
      primaryStyle: v.string(),
      secondaryStyle: v.optional(v.string()),
      description: v.string(),
      emotionalVibe: v.string(),
      decorDensity: v.string(),
      colorPattern: v.string(),
    })),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]),

  // Rate limiting to prevent API abuse
  rateLimits: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()), // legacy: kept for backward compat
    operation: v.union(
      v.literal("analysis"),
      v.literal("recommendations"),
      v.literal("visualization")
    ),
    count: v.number(),
    windowStart: v.number(),
    lastReset: v.number(),
  })
    .index("by_user_operation", ["userId", "operation"]),
});
