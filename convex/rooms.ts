import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import {
  validateStringLength,
  validateNoXSS,
  validateDimensions,
  validateRoomType,
} from "./lib/validators";
import { requireUserId } from "./auth";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const get = internalQuery({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPublic = query({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const room = await ctx.db.get(args.id);
    if (!room) return null;

    // Verify ownership via project
    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return room;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    type: v.string(),
    dimensions: v.optional(v.object({
      width: v.number(),
      length: v.number(),
      height: v.optional(v.number()),
      unit: v.string(),
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership of project
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Validate inputs
    validateStringLength(args.name, "Room name", 1, 100);
    validateNoXSS(args.name, "Room name");
    validateRoomType(args.type);

    if (args.notes) {
      validateStringLength(args.notes, "Room notes", 0, 1000);
      validateNoXSS(args.notes, "Room notes");
    }

    if (args.dimensions) {
      validateDimensions(
        args.dimensions.width,
        args.dimensions.length,
        args.dimensions.height
      );
    }

    const now = Date.now();
    return await ctx.db.insert("rooms", {
      projectId: args.projectId,
      name: args.name,
      type: args.type,
      photos: [],
      dimensions: args.dimensions,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("rooms"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    dimensions: v.optional(v.object({
      width: v.number(),
      length: v.number(),
      height: v.optional(v.number()),
      unit: v.string(),
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Validate inputs
    if (args.name !== undefined) {
      validateStringLength(args.name, "Room name", 1, 100);
      validateNoXSS(args.name, "Room name");
    }

    if (args.type !== undefined) {
      validateRoomType(args.type);
    }

    if (args.notes !== undefined) {
      validateStringLength(args.notes, "Room notes", 0, 1000);
      validateNoXSS(args.notes, "Room notes");
    }

    if (args.dimensions !== undefined) {
      validateDimensions(
        args.dimensions.width,
        args.dimensions.length,
        args.dimensions.height
      );
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    for (const photo of room.photos) {
      await ctx.storage.delete(photo.storageId);
    }

    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_room", (q) => q.eq("roomId", args.id))
      .collect();
    for (const analysis of analyses) {
      await ctx.db.delete(analysis._id);
    }

    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_room", (q) => q.eq("roomId", args.id))
      .collect();
    for (const rec of recommendations) {
      await ctx.db.delete(rec._id);
    }

    const visualizations = await ctx.db
      .query("visualizations")
      .withIndex("by_room", (q) => q.eq("roomId", args.id))
      .collect();
    for (const vis of visualizations) {
      if (vis.output?.storageId) {
        await ctx.storage.delete(vis.output.storageId);
      }
      await ctx.db.delete(vis._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const addPhoto = mutation({
  args: {
    roomId: v.id("rooms"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to get storage URL");

    const photos = [...room.photos, {
      storageId: args.storageId,
      url,
      uploadedAt: Date.now(),
    }];

    await ctx.db.patch(args.roomId, {
      photos,
      updatedAt: Date.now(),
    });

    return args.storageId;
  },
});

export const removePhoto = mutation({
  args: {
    roomId: v.id("rooms"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ownership
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const project = await ctx.db.get(room.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const photos = room.photos.filter((p) => p.storageId !== args.storageId);

    await ctx.db.patch(args.roomId, {
      photos,
      updatedAt: Date.now(),
    });

    await ctx.storage.delete(args.storageId);
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
