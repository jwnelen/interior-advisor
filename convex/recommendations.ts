import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkRateLimit, incrementRateLimit } from "./lib/rateLimiting";
import { requireUserId } from "./auth";

export const getByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership via room → project
    const room = await ctx.db.get(args.roomId);
    if (!room) return [];
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) return [];

    return await ctx.db
      .query("recommendations")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const getCustomQuestions = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership via room → project
    const room = await ctx.db.get(args.roomId);
    if (!room) return [];
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) return [];

    return await ctx.db
      .query("recommendations")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("tier"), "custom_question"))
      .order("desc")
      .collect();
  },
});

export const deleteCustomQuestion = mutation({
  args: { id: v.id("recommendations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const rec = await ctx.db.get(args.id);
    if (!rec || rec.tier !== "custom_question") {
      throw new Error("Not a custom question recommendation");
    }

    // Verify ownership via room → project
    const room = await ctx.db.get(rec.roomId);
    if (!room) throw new Error("Room not found");
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});

export const askCustomQuestion = mutation({
  args: {
    roomId: v.id("rooms"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership via room → project
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");

    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No completed analysis found for this room");
    }

    // Create a new custom question recommendation
    const recommendationId = await ctx.db.insert("recommendations", {
      roomId: args.roomId,
      analysisId: analysis._id,
      tier: "custom_question",
      status: "generating",
      userQuestion: args.question,
      items: [],
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.ai.advisor.answerCustomQuestion, {
      roomId: args.roomId,
      analysisId: analysis._id,
      recommendationId,
      userQuestion: args.question,
    });

    return recommendationId;
  },
});

export const generate = mutation({
  args: {
    roomId: v.id("rooms"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Check rate limit
    const rateLimitError = await checkRateLimit(ctx, userId, "recommendations");
    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    // Verify ownership
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No completed analysis found for this room");
    }

    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_tier", (q) =>
        q.eq("roomId", args.roomId).eq("tier", args.tier)
      )
      .first();

    if (existing && existing.status === "completed") {
      return existing._id;
    }

    let recommendationId;
    if (existing) {
      await ctx.db.patch(existing._id, { status: "generating" });
      recommendationId = existing._id;
    } else {
      recommendationId = await ctx.db.insert("recommendations", {
        roomId: args.roomId,
        analysisId: analysis._id,
        tier: args.tier,
        status: "generating",
        items: [],
        createdAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(0, internal.ai.advisor.generateRecommendations, {
      roomId: args.roomId,
      analysisId: analysis._id,
      tier: args.tier,
      recommendationId,
    });

    // Increment rate limit after successful scheduling
    await incrementRateLimit(ctx, userId, "recommendations");

    return recommendationId;
  },
});

export const save = internalMutation({
  args: {
    id: v.id("recommendations"),
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      items: args.items,
      summary: args.summary,
    });
  },
});

export const fail = internalMutation({
  args: {
    id: v.id("recommendations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
    });
  },
});

export const getById = internalQuery({
  args: { id: v.id("recommendations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateIkeaProducts = internalMutation({
  args: {
    id: v.id("recommendations"),
    itemUpdates: v.array(v.object({
      itemId: v.string(),
      ikeaProduct: v.object({
        name: v.string(),
        price: v.string(),
        imageUrl: v.string(),
        productUrl: v.string(),
        fetchedAt: v.number(),
      }),
    })),
    ikeaSearchStatus: v.union(
      v.literal("pending"),
      v.literal("searching"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.id);
    if (!rec) return;

    const updateMap = new Map(args.itemUpdates.map((u) => [u.itemId, u.ikeaProduct]));

    const updatedItems = rec.items.map((item) => {
      const ikeaProduct = updateMap.get(item.id);
      return ikeaProduct ? { ...item, ikeaProduct } : item;
    });

    await ctx.db.patch(args.id, {
      items: updatedItems,
      ikeaSearchStatus: args.ikeaSearchStatus,
    });
  },
});

export const toggleItemSelection = mutation({
  args: {
    id: v.id("recommendations"),
    itemId: v.string(),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const rec = await ctx.db.get(args.id);
    if (!rec) throw new Error("Recommendation not found");

    // Verify ownership via room → project
    const room = await ctx.db.get(rec.roomId);
    if (!room) throw new Error("Room not found");
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");

    const items = rec.items.map((item) =>
      item.id === args.itemId ? { ...item, selected: args.selected } : item
    );

    await ctx.db.patch(args.id, { items });
  },
});

export const regenerate = mutation({
  args: {
    roomId: v.id("rooms"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership via room → project
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");

    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No completed analysis found for this room");
    }

    // Find existing recommendation
    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_tier", (q) =>
        q.eq("roomId", args.roomId).eq("tier", args.tier)
      )
      .first();

    // Reset to generating status
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "generating",
        items: [],
      });
    } else {
      // Create new if doesn't exist
      const recommendationId = await ctx.db.insert("recommendations", {
        roomId: args.roomId,
        analysisId: analysis._id,
        tier: args.tier,
        status: "generating",
        items: [],
        createdAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.ai.advisor.generateRecommendations, {
        roomId: args.roomId,
        analysisId: analysis._id,
        tier: args.tier,
        recommendationId,
      });

      return recommendationId;
    }

    // Trigger regeneration
    await ctx.scheduler.runAfter(0, internal.ai.advisor.generateRecommendations, {
      roomId: args.roomId,
      analysisId: analysis._id,
      tier: args.tier,
      recommendationId: existing._id,
    });

    return existing._id;
  },
});
