# Interior Advisor - Technical Architecture

## System Overview

The Interior Advisor is an AI-powered home interior design assistant that helps users understand their spaces, discover their style preferences, and visualize potential improvements within their budget constraints.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Discovery   │  │   Project    │  │    Room      │  │ Visualization │    │
│  │    Quiz      │  │  Dashboard   │  │  Workspace   │  │   Gallery     │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴────────┬────────┴─────────────────┘             │
│                                    │                                         │
│                          ┌─────────▼─────────┐                              │
│                          │   React Hooks &   │                              │
│                          │   Convex Client   │                              │
│                          └─────────┬─────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ Real-time Sync
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONVEX BACKEND                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Functions Layer                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  Queries   │  │ Mutations  │  │  Actions   │  │ Scheduled  │     │   │
│  │  │ (reads)    │  │ (writes)   │  │ (external) │  │   Jobs     │     │   │
│  │  └────────────┘  └────────────┘  └─────┬──────┘  └────────────┘     │   │
│  └────────────────────────────────────────┼─────────────────────────────┘   │
│                                           │                                  │
│  ┌────────────────────┐    ┌──────────────┼──────────────┐                  │
│  │   File Storage     │    │              │              │                  │
│  │  (Room Photos,     │    │    ┌────────▼────────┐     │                  │
│  │   Visualizations)  │    │    │  External APIs  │     │                  │
│  └────────────────────┘    │    └────────┬────────┘     │                  │
│                            │             │              │                  │
│  ┌────────────────────┐    └─────────────┼──────────────┘                  │
│  │     Database       │                  │                                  │
│  │  (Projects, Rooms, │                  │                                  │
│  │   Analyses, etc.)  │                  │                                  │
│  └────────────────────┘                  │                                  │
└──────────────────────────────────────────┼──────────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
           ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
           │    OpenAI       │   │    Replicate    │   │   Product API   │
           │    GPT-4o       │   │   (SD 3.5 +     │   │   (Future)      │
           │  Scene Analysis │   │   ControlNet)   │   │                 │
           │  + Advice Gen   │   │  Image Gen      │   │                 │
           └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Next.js Client** | UI rendering, routing, user interactions, real-time state sync |
| **Convex Database** | Persistent storage, real-time subscriptions, ACID transactions |
| **Convex Functions** | Business logic, data validation, external API orchestration |
| **Convex File Storage** | Photo uploads, generated images, mood board assets |
| **OpenAI GPT-4o** | Vision-based scene analysis, interior design recommendations |
| **Replicate** | Image generation with ControlNet for realistic visualizations |

---

## Directory Structure

```
interior-advisor/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles + Tailwind
│   │
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── page.tsx              # Projects overview
│   │
│   ├── discover/                 # Style discovery flow
│   │   ├── page.tsx              # Quiz entry point
│   │   ├── quiz/                 # Multi-step quiz
│   │   │   └── [step]/page.tsx   # Dynamic quiz steps
│   │   └── results/page.tsx      # Style profile results
│   │
│   ├── project/                  # Project workspace
│   │   └── [id]/
│   │       ├── page.tsx          # Project overview
│   │       ├── rooms/
│   │       │   └── [roomId]/
│   │       │       ├── page.tsx  # Room detail view
│   │       │       ├── analyze/page.tsx
│   │       │       └── visualize/page.tsx
│   │       ├── recommendations/page.tsx
│   │       └── budget/page.tsx
│   │
│   └── api/                      # API routes (if needed for webhooks)
│       └── webhooks/
│           └── replicate/route.ts
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── slider.tsx
│   │   └── ...
│   │
│   ├── discovery/                # Discovery module components
│   │   ├── style-quiz.tsx
│   │   ├── mood-selector.tsx
│   │   ├── preference-slider.tsx
│   │   └── style-profile-card.tsx
│   │
│   ├── project/                  # Project components
│   │   ├── project-card.tsx
│   │   ├── project-header.tsx
│   │   └── budget-tracker.tsx
│   │
│   ├── room/                     # Room components
│   │   ├── room-card.tsx
│   │   ├── photo-upload.tsx
│   │   ├── analysis-viewer.tsx
│   │   └── scene-overlay.tsx
│   │
│   ├── recommendations/          # Recommendation components
│   │   ├── recommendation-card.tsx
│   │   ├── tier-toggle.tsx       # Small/big changes toggle
│   │   └── product-match.tsx
│   │
│   └── visualization/            # Visualization components
│       ├── visualization-gallery.tsx
│       ├── before-after-slider.tsx
│       ├── generation-progress.tsx
│       └── prompt-editor.tsx
│
├── convex/                       # Convex backend
│   ├── _generated/               # Auto-generated types
│   ├── schema.ts                 # Database schema
│   │
│   ├── projects.ts               # Project queries/mutations
│   ├── rooms.ts                  # Room queries/mutations
│   ├── analyses.ts               # Analysis queries/mutations
│   ├── recommendations.ts        # Recommendation queries/mutations
│   ├── visualizations.ts         # Visualization queries/mutations
│   ├── moodBoards.ts             # Mood board queries/mutations
│   ├── products.ts               # Product queries/mutations
│   │
│   ├── ai/                       # AI-related actions
│   │   ├── sceneAnalysis.ts      # GPT-4o vision analysis
│   │   ├── advisor.ts            # Recommendation generation
│   │   └── imageGeneration.ts    # Replicate integration
│   │
│   └── lib/                      # Convex utilities
│       ├── validators.ts         # Input validation schemas
│       └── helpers.ts            # Shared helper functions
│
├── lib/                          # Client-side utilities
│   ├── types.ts                  # TypeScript type definitions
│   ├── constants.ts              # App constants
│   ├── utils.ts                  # Utility functions
│   └── hooks/                    # Custom React hooks
│       ├── use-local-session.ts  # Anonymous session management
│       └── use-upload.ts         # File upload handling
│
├── public/                       # Static assets
│   ├── styles/                   # Style reference images
│   └── icons/                    # App icons
│
├── tailwind.config.ts            # Tailwind configuration
├── next.config.js                # Next.js configuration
├── convex.json                   # Convex configuration
├── package.json
└── tsconfig.json
```

---

## Data Models (Convex Schema)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User projects - container for a design endeavor
  projects: defineTable({
    sessionId: v.string(),           // Anonymous session identifier
    name: v.string(),
    description: v.optional(v.string()),
    budget: v.optional(v.object({
      total: v.number(),
      spent: v.number(),
      currency: v.string(),
    })),
    styleProfile: v.optional(v.object({
      primaryStyle: v.string(),      // e.g., "modern", "scandinavian"
      secondaryStyle: v.optional(v.string()),
      colorPreferences: v.array(v.string()),
      priorities: v.array(v.string()), // e.g., ["comfort", "aesthetics", "function"]
    })),
    constraints: v.optional(v.object({
      rentalFriendly: v.boolean(),
      petFriendly: v.boolean(),
      childFriendly: v.boolean(),
      mobilityAccessible: v.boolean(),
    })),
    status: v.union(
      v.literal("discovery"),
      v.literal("active"),
      v.literal("completed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["sessionId", "status"]),

  // Individual rooms within a project
  rooms: defineTable({
    projectId: v.id("projects"),
    name: v.string(),                 // e.g., "Living Room", "Master Bedroom"
    type: v.string(),                 // Standardized room type
    photos: v.array(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      isPrimary: v.boolean(),
      uploadedAt: v.number(),
    })),
    dimensions: v.optional(v.object({
      width: v.number(),
      length: v.number(),
      height: v.number(),
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
    photoStorageId: v.id("_storage"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    results: v.optional(v.object({
      // Detected elements
      furniture: v.array(v.object({
        item: v.string(),
        location: v.string(),
        condition: v.string(),
        style: v.string(),
      })),
      lighting: v.object({
        natural: v.string(),          // "abundant", "moderate", "limited"
        artificial: v.array(v.string()),
        assessment: v.string(),
      }),
      colors: v.object({
        dominant: v.array(v.string()),
        accents: v.array(v.string()),
        palette: v.string(),          // "warm", "cool", "neutral"
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
      // Raw analysis for debugging
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
      v.literal("quick_wins"),        // Small, low-cost changes
      v.literal("transformations")    // Larger investments
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
      category: v.string(),           // "furniture", "lighting", "decor", etc.
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
      v.literal("full_render"),       // Complete room transformation
      v.literal("item_change"),       // Single item replacement
      v.literal("color_change"),      // Wall/floor color change
      v.literal("style_transfer")     // Style transformation
    ),
    input: v.object({
      prompt: v.string(),
      negativePrompt: v.optional(v.string()),
      controlNetMode: v.string(),     // "depth", "canny", "mlsd"
      strength: v.number(),           // 0.0 - 1.0
      seed: v.optional(v.number()),
    }),
    output: v.optional(v.object({
      storageId: v.id("_storage"),
      url: v.string(),
      replicateId: v.string(),
    })),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_status", ["status"])
    .index("by_recommendation", ["recommendationId"]),

  // Style mood boards
  moodBoards: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    style: v.string(),
    images: v.array(v.object({
      storageId: v.optional(v.id("_storage")),
      externalUrl: v.optional(v.string()),
      caption: v.optional(v.string()),
    })),
    colorPalette: v.array(v.string()),  // Hex codes
    keywords: v.array(v.string()),
    isSystemGenerated: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_style", ["style"]),

  // Matched products from commerce sources
  products: defineTable({
    recommendationItemId: v.string(),  // References recommendation item ID
    roomId: v.id("rooms"),
    source: v.string(),                // "ikea", "wayfair", etc.
    externalId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.object({
      amount: v.number(),
      currency: v.string(),
    }),
    url: v.string(),
    imageUrl: v.optional(v.string()),
    category: v.string(),
    matchScore: v.number(),            // How well it matches recommendation
    inStock: v.boolean(),
    fetchedAt: v.number(),
  })
    .index("by_recommendation", ["recommendationItemId"])
    .index("by_room", ["roomId"])
    .index("by_source", ["source"]),
});
```

---

## AI Pipeline

### Pipeline Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Photo      │     │    VLM       │     │  Constraint  │
│   Upload     │────▶│   Scene      │────▶│   Merger     │
│              │     │   Analysis   │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                     ┌───────────────────────────┘
                     │
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Results    │     │   Image      │     │    LLM       │
│   Display    │◀────│   Generation │◀────│   Advisor    │
│              │     │  (ControlNet)│     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Stage 1: Photo Upload & Storage

```typescript
// convex/rooms.ts
export const uploadPhoto = mutation({
  args: {
    roomId: v.id("rooms"),
    storageId: v.id("_storage"),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.roomId, {
      photos: [...room.photos, {
        storageId: args.storageId,
        url: url!,
        isPrimary: args.isPrimary,
        uploadedAt: Date.now(),
      }],
      updatedAt: Date.now(),
    });

    // Trigger analysis
    await ctx.scheduler.runAfter(0, internal.ai.sceneAnalysis.analyze, {
      roomId: args.roomId,
      photoStorageId: args.storageId,
    });
  },
});
```

### Stage 2: VLM Scene Analysis (GPT-4o)

```typescript
// convex/ai/sceneAnalysis.ts
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
      const imageUrl = await ctx.storage.getUrl(args.photoStorageId);

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
              { type: "image_url", image_url: { url: imageUrl! } },
              { type: "text", text: SCENE_ANALYSIS_USER_PROMPT },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const results = JSON.parse(response.choices[0].message.content);

      await ctx.runMutation(internal.analyses.complete, {
        analysisId,
        results,
      });
    } catch (error) {
      await ctx.runMutation(internal.analyses.fail, {
        analysisId,
        error: error.message,
      });
    }
  },
});

const SCENE_ANALYSIS_SYSTEM_PROMPT = `You are an expert interior designer
analyzing room photographs. Provide detailed, structured analysis of:
- Furniture items (type, style, condition, placement)
- Lighting (natural light sources, artificial fixtures, overall assessment)
- Color palette (dominant colors, accents, warmth/coolness)
- Room layout (traffic flow, focal points, problem areas)
- Overall style (detected style, confidence, supporting elements)

Respond in JSON format matching the provided schema.`;
```

### Stage 3: Constraint Merger

Combines scene analysis with user constraints before generating recommendations:

```typescript
// convex/ai/advisor.ts
interface ConstraintContext {
  analysis: AnalysisResults;
  project: {
    budget: Budget;
    styleProfile: StyleProfile;
    constraints: ProjectConstraints;
  };
  room: {
    type: string;
    dimensions?: Dimensions;
  };
}

function buildAdvisorContext(ctx: ConstraintContext): string {
  return `
## Room Analysis
${JSON.stringify(ctx.analysis, null, 2)}

## User Preferences
- Primary Style: ${ctx.project.styleProfile.primaryStyle}
- Budget: ${ctx.project.budget.currency} ${ctx.project.budget.total - ctx.project.budget.spent} remaining
- Priorities: ${ctx.project.styleProfile.priorities.join(", ")}

## Constraints
- Rental Friendly: ${ctx.project.constraints.rentalFriendly ? "Yes - no permanent modifications" : "No"}
- Pet Friendly: ${ctx.project.constraints.petFriendly ? "Yes - durable, easy-clean materials" : "No"}
- Child Friendly: ${ctx.project.constraints.childFriendly ? "Yes - safe, rounded edges" : "No"}

## Room Context
- Type: ${ctx.room.type}
${ctx.room.dimensions ? `- Dimensions: ${ctx.room.dimensions.width}x${ctx.room.dimensions.length} ${ctx.room.dimensions.unit}` : ""}
`;
}
```

### Stage 4: LLM Advisor (Recommendation Generation)

```typescript
// convex/ai/advisor.ts
export const generateRecommendations = internalAction({
  args: {
    roomId: v.id("rooms"),
    analysisId: v.id("analyses"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
  },
  handler: async (ctx, args) => {
    const context = await buildFullContext(ctx, args);

    const tierPrompt = args.tier === "quick_wins"
      ? QUICK_WINS_PROMPT
      : TRANSFORMATIONS_PROMPT;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ADVISOR_SYSTEM_PROMPT },
        { role: "user", content: context + "\n\n" + tierPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const recommendations = JSON.parse(response.choices[0].message.content);

    await ctx.runMutation(internal.recommendations.save, {
      roomId: args.roomId,
      analysisId: args.analysisId,
      tier: args.tier,
      items: recommendations.items,
      summary: recommendations.summary,
    });
  },
});

const QUICK_WINS_PROMPT = `Generate 3-5 "quick win" recommendations:
- Budget: Under $200 each
- Effort: DIY or easy installation
- Impact: Noticeable improvement
- Types: Accessories, textiles, lighting, plants, organization

For each, include a visualization prompt for image generation.`;

const TRANSFORMATIONS_PROMPT = `Generate 2-4 "transformation" recommendations:
- Budget: $200-2000 each
- Effort: May require professional help
- Impact: Significant room improvement
- Types: Furniture, fixtures, layout changes, paint

For each, include a visualization prompt for image generation.`;
```

### Stage 5: Image Generation (Replicate + ControlNet)

The visualization mutation selects the room's primary photo when available and gracefully falls back to the first uploaded image so generation can proceed even if older data lacks an explicit primary flag.

```typescript
// convex/ai/imageGeneration.ts
export const generateVisualization = internalAction({
  args: {
    visualizationId: v.id("visualizations"),
    roomId: v.id("rooms"),
    originalPhotoId: v.id("_storage"),
    prompt: v.string(),
    type: v.string(),
    controlNetMode: v.string(),
    strength: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) throw new Error("Failed to resolve room photo");

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) {
        throw new Error("Replicate API token (REPLICATE_API_TOKEN) is not configured");
      }

      const replicate = new Replicate({ auth: replicateToken });
      const rawOutput = await replicate.run("stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc", {
        input: {
          image: originalUrl,
          prompt: buildInteriorPrompt(args.prompt),
          negative_prompt: NEGATIVE_PROMPT,
          prompt_strength: Math.min(Math.max(args.strength, 0), 1),
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
          refine: "expert_ensemble_refiner",
          high_noise_frac: 0.8,
        },
      });

      const asset = await resolveVisualizationOutput(rawOutput);
      let storageId;

      if (asset.kind === "url") {
        const response = await fetch(asset.url);
        if (!response.ok) {
          throw new Error(`Failed to download generated image: ${response.status}`);
        }
        const blob = await response.blob();
        storageId = await ctx.storage.store(blob);
      } else {
        storageId = await ctx.storage.store(asset.blob);
      }

      const signedUrl = await ctx.storage.getUrl(storageId);
      if (!signedUrl) throw new Error("Failed to generate public URL for visualization");

      await ctx.runMutation(internal.visualizations.complete, {
        id: args.visualizationId,
        storageId,
        url: signedUrl,
      });
    } catch (error) {
      await ctx.runMutation(internal.visualizations.fail, {
        id: args.visualizationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

function buildInteriorPrompt(userPrompt: string): string {
  return `Interior design photograph, ${userPrompt}, professional real estate photography, natural lighting, high resolution, photorealistic, architectural digest style`;
}

const NEGATIVE_PROMPT = `cartoon, anime, illustration, painting, drawing, art, sketch, low quality, blurry, distorted, watermark, text, logo, oversaturated, deformed, ugly, bad anatomy`;
```

Helper utilities normalize Replicate responses (direct URLs, file streams, typed arrays) so storage ingestion is deterministic, and all configuration failures bubble back to the UI with actionable error messages.

---

## Key Features

### 1. Discovery Module

The discovery flow helps users identify their style preferences through an interactive quiz.

**Components:**
- `StyleQuiz`: Multi-step questionnaire with image-based choices
- `MoodSelector`: Visual grid for selecting inspiring room images
- `PreferenceSlider`: Trade-off sliders (comfort vs. aesthetics, etc.)
- `StyleProfileCard`: Results display with detected styles

**Data Flow:**
```
Quiz Responses → Style Calculation → styleProfile saved to Project
```

Each saved profile captures the primary/secondary styles, derived color palette hints, and top user priorities so downstream recommendation prompts stay aligned with personal taste.

**Style Categories:**
- Modern / Contemporary
- Scandinavian / Nordic
- Industrial / Urban
- Traditional / Classic
- Bohemian / Eclectic
- Minimalist / Japanese
- Coastal / Hamptons
- Mid-Century Modern

### 2. Scene Understanding

AI-powered analysis of room photographs to understand current state.

**Detection Capabilities:**
- **Furniture**: Item identification, style classification, placement analysis
- **Lighting**: Natural light assessment, fixture identification, coverage gaps
- **Colors**: Dominant palette extraction, harmony analysis
- **Layout**: Traffic flow, focal points, spatial issues
- **Style**: Current style detection with confidence scoring

**Output Example:**
```json
{
  "furniture": [
    {
      "item": "Sofa",
      "location": "center-left wall",
      "condition": "good",
      "style": "mid-century modern"
    }
  ],
  "lighting": {
    "natural": "moderate",
    "artificial": ["overhead pendant", "floor lamp"],
    "assessment": "Good ambient, lacks task lighting"
  },
  "style": {
    "detected": "transitional",
    "confidence": 0.78,
    "elements": ["clean lines", "neutral palette", "mixed materials"]
  }
}
```

### 3. Two-Tier Recommendations

Recommendations are split into actionable tiers based on investment level.

**Quick Wins (Tier 1):**
- Budget: Under $200 per item
- Effort: DIY or simple installation
- Examples: Throw pillows, plants, artwork, lamps, organizers
- Turnaround: Immediate to same-week

**Transformations (Tier 2):**
- Budget: $200-2000 per item
- Effort: May require professional help
- Examples: Furniture pieces, light fixtures, paint, rugs
- Turnaround: Days to weeks

**Each Recommendation Includes:**
- Clear title and description
- Estimated cost range
- Impact rating (high/medium/low)
- Difficulty level (DIY/easy install/professional)
- Reasoning based on analysis
- Pre-written visualization prompt

### 4. ControlNet Visualization

Realistic image generation that preserves room structure.

**Supported Modes:**
| Mode | Use Case | Preservation |
|------|----------|--------------|
| **Depth** | Full room restyling | Room geometry, perspective |
| **Canny** | Furniture replacement | Edge structure, placement |
| **MLSD** | Architectural changes | Straight lines, walls |

**Generation Parameters:**
- `strength`: 0.3-0.5 for subtle changes, 0.6-0.8 for dramatic
- `guidance_scale`: 7.5 for balanced creativity/adherence
- `steps`: 30 for quality/speed balance

**Before/After Display:**
- Interactive slider comparison
- Side-by-side view option
- Zoom and pan for details

### 5. Budget Tracking & Product Matching

**Budget Features:**
- Project-level budget setting
- Per-recommendation cost tracking
- Running total with remaining balance
- Cost tier filtering

**Product Matching (Future):**
- Parse recommendation details
- Query product APIs (IKEA, Wayfair, Amazon)
- Match by category, style, price range
- Display with direct purchase links
- Track product availability

---

## API Integration Details

### OpenAI Configuration

```typescript
// lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting: 10,000 TPM for GPT-4o
// Image tokens: ~1,000 tokens per image at high detail
```

### Replicate Configuration

```typescript
// lib/replicate.ts
import Replicate from "replicate";

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Models used:
// - stability-ai/stable-diffusion-3.5-large (image generation)
// - cjwbw/midas (depth estimation)
// - Optional: jagilley/controlnet-* for additional modes
```

### Environment Variables

```bash
# .env.local
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Set in Convex dashboard
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
```

---

## Session Management

Since there's no authentication, users are identified by anonymous sessions stored in localStorage.

```typescript
// lib/hooks/use-local-session.ts
export function useLocalSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("interior-advisor-session");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("interior-advisor-session", id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
```

**Limitations:**
- Sessions are device-specific
- No cross-device sync
- Data loss if localStorage cleared

**Future Enhancement Path:**
- Add optional email-based accounts
- Session migration on sign-up
- Cross-device project sync

---

## Deployment

### Vercel Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { hostname: "*.convex.cloud" },      // Convex file storage
      { hostname: "replicate.delivery" },   // Replicate outputs
    ],
  },
};
```

### Convex Deployment

```bash
# Development
npx convex dev

# Production
npx convex deploy
```

### Build & Deploy

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Vercel (auto-deploys on git push)
vercel
```

---

## Performance Considerations

### Image Optimization
- Resize uploads to max 2048px before storage
- Use Next.js Image component for display
- Generate thumbnails for gallery views

### AI Latency
- Scene analysis: 5-15 seconds
- Recommendations: 3-8 seconds
- Image generation: 15-45 seconds

### Caching Strategy
- Cache analysis results (immutable once complete)
- Cache product searches (15-minute TTL)
- Real-time sync for user-generated content

### Rate Limiting
- OpenAI: Implement request queuing
- Replicate: Use webhook callbacks for long jobs
- Client: Debounce rapid interactions
