import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .first();
  },
});

export const get = internalQuery({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPublic = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .collect();
  },
});

export const create = internalMutation({
  args: {
    roomId: v.id("rooms"),
    photoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyses", {
      roomId: args.roomId,
      photoStorageIds: args.photoStorageIds,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("analyses"),
    status: v.union(
      v.literal("pending"),
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
    id: v.id("analyses"),
    results: v.object({
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
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      results: args.results,
      completedAt: Date.now(),
    });
  },
});

export const fail = internalMutation({
  args: {
    id: v.id("analyses"),
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

export const retry = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.photos.length === 0) throw new Error("No photos uploaded");

    const photoStorageIds = room.photos.map((p) => p.storageId);

    const analysisId = await ctx.db.insert("analyses", {
      roomId: args.roomId,
      photoStorageIds,
      status: "pending",
      createdAt: Date.now(),
    });

    return analysisId;
  },
});

export const generate = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.photos.length === 0) throw new Error("No photos uploaded");

    const photoStorageIds = room.photos.map((p) => p.storageId);

    // Check if there's already a pending or processing analysis
    const existingAnalysis = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .first();

    if (existingAnalysis) {
      return existingAnalysis._id;
    }

    // Create new analysis record
    const analysisId = await ctx.db.insert("analyses", {
      roomId: args.roomId,
      photoStorageIds,
      status: "pending",
      createdAt: Date.now(),
    });

    // Trigger the AI analysis
    await ctx.scheduler.runAfter(0, internal.ai.sceneAnalysis.analyze, {
      roomId: args.roomId,
      photoStorageIds,
    });

    return analysisId;
  },
});
