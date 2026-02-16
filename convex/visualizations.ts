import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkRateLimit, incrementRateLimit } from "./lib/rateLimiting";
import { validatePrompt } from "./lib/validators";

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
    photoStorageId: v.optional(v.id("_storage")),
    controlNetMode: v.optional(v.string()),
    strength: v.optional(v.number()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check rate limit
    const rateLimitError = await checkRateLimit(ctx, args.sessionId, "visualization");
    if (rateLimitError) {
      throw new Error(rateLimitError);
    }

    // Verify ownership
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }

    // Validate prompt
    validatePrompt(args.prompt);

    const chosenStorageId = args.photoStorageId ?? room.photos[0]?.storageId;
    if (!chosenStorageId) throw new Error("No photo available for visualization");

    const visualizationId = await ctx.db.insert("visualizations", {
      roomId: args.roomId,
      recommendationId: args.recommendationId,
      originalPhotoId: chosenStorageId,
      status: "queued",
      type: args.type,
      input: {
        prompt: args.prompt,
        controlNetMode: args.controlNetMode ?? "depth",
        strength: args.strength ?? 0.5,
      },
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.ai.imageGeneration.generateVisualization, {
      visualizationId,
      roomId: args.roomId,
      originalPhotoId: chosenStorageId,
      prompt: args.prompt,
      type: args.type,
      controlNetMode: args.controlNetMode ?? "depth",
      strength: args.strength ?? 0.5,
    });

    // Increment rate limit after successful scheduling
    await incrementRateLimit(ctx, args.sessionId, "visualization");

    return visualizationId;
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
