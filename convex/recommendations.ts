import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recommendations")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const getByTier = query({
  args: {
    roomId: v.id("rooms"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recommendations")
      .withIndex("by_tier", (q) =>
        q.eq("roomId", args.roomId).eq("tier", args.tier)
      )
      .first();
  },
});

export const get = query({
  args: { id: v.id("recommendations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const generate = mutation({
  args: {
    roomId: v.id("rooms"),
    tier: v.union(v.literal("quick_wins"), v.literal("transformations")),
  },
  handler: async (ctx, args) => {
    // Get the latest completed analysis for this room
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No completed analysis found for this room");
    }

    // Check if we already have recommendations for this tier
    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_tier", (q) =>
        q.eq("roomId", args.roomId).eq("tier", args.tier)
      )
      .first();

    if (existing && existing.status === "completed") {
      return existing._id;
    }

    // Create or update recommendation record
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

    // Trigger AI generation
    await ctx.scheduler.runAfter(0, internal.ai.advisor.generateRecommendations, {
      roomId: args.roomId,
      analysisId: analysis._id,
      tier: args.tier,
      recommendationId,
    });

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

export const toggleItemSelection = mutation({
  args: {
    id: v.id("recommendations"),
    itemId: v.string(),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.id);
    if (!rec) throw new Error("Recommendation not found");

    const items = rec.items.map((item) =>
      item.id === args.itemId ? { ...item, selected: args.selected } : item
    );

    await ctx.db.patch(args.id, { items });
  },
});
