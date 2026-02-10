import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("visualizations")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("visualizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const generate = mutation({
  args: {
    roomId: v.id("rooms"),
    recommendationId: v.optional(v.id("recommendations")),
    prompt: v.string(),
    type: v.union(
      v.literal("full_render"),
      v.literal("item_change"),
      v.literal("color_change"),
      v.literal("style_transfer")
    ),
    controlNetMode: v.optional(v.string()),
    strength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const primaryPhoto =
      room.photos.find((p) => p.isPrimary) ?? room.photos[0];
    if (!primaryPhoto) throw new Error("No photo available for visualization");

    const visualizationId = await ctx.db.insert("visualizations", {
      roomId: args.roomId,
      recommendationId: args.recommendationId,
      originalPhotoId: primaryPhoto.storageId,
      status: "queued",
      type: args.type,
      input: {
        prompt: args.prompt,
        controlNetMode: args.controlNetMode ?? "depth",
        strength: args.strength ?? 0.5,
      },
      createdAt: Date.now(),
    });

    // Trigger AI generation
    await ctx.scheduler.runAfter(0, internal.ai.imageGeneration.generateVisualization, {
      visualizationId,
      roomId: args.roomId,
      originalPhotoId: primaryPhoto.storageId,
      prompt: args.prompt,
      type: args.type,
      controlNetMode: args.controlNetMode ?? "depth",
      strength: args.strength ?? 0.5,
    });

    return visualizationId;
  },
});

export const create = internalMutation({
  args: {
    roomId: v.id("rooms"),
    recommendationId: v.optional(v.id("recommendations")),
    originalPhotoId: v.id("_storage"),
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
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("visualizations", {
      roomId: args.roomId,
      recommendationId: args.recommendationId,
      originalPhotoId: args.originalPhotoId,
      status: args.status as "queued" | "processing" | "completed" | "failed",
      type: args.type,
      input: args.input,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("visualizations"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const complete = internalMutation({
  args: {
    id: v.id("visualizations"),
    storageId: v.id("_storage"),
    url: v.string(),
    replicateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      output: {
        storageId: args.storageId,
        url: args.url,
        replicateId: args.replicateId,
      },
      completedAt: Date.now(),
    });
  },
});

export const fail = internalMutation({
  args: {
    id: v.id("visualizations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("visualizations") },
  handler: async (ctx, args) => {
    const vis = await ctx.db.get(args.id);
    if (vis?.output?.storageId) {
      await ctx.storage.delete(vis.output.storageId);
    }
    await ctx.db.delete(args.id);
  },
});
