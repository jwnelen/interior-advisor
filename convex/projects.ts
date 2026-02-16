import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import {
  validateStringLength,
  validateNoXSS,
  validateBudget,
} from "./lib/validators";

export const list = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

export const get = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPublic = query({
  args: { id: v.id("projects"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    // Verify ownership
    if (project.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }

    return project;
  },
});

export const create = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    budget: v.optional(v.object({
      total: v.number(),
      spent: v.number(),
      currency: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    validateStringLength(args.name, "Project name", 1, 100);
    validateNoXSS(args.name, "Project name");

    if (args.description) {
      validateStringLength(args.description, "Project description", 0, 500);
      validateNoXSS(args.description, "Project description");
    }

    if (args.budget) {
      validateBudget(args.budget.total, args.budget.spent);
    }

    const now = Date.now();
    return await ctx.db.insert("projects", {
      sessionId: args.sessionId,
      name: args.name,
      description: args.description,
      budget: args.budget,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    sessionId: v.string(),
    name: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }

    // Validate inputs
    if (args.name !== undefined) {
      validateStringLength(args.name, "Project name", 1, 100);
      validateNoXSS(args.name, "Project name");
    }

    if (args.description !== undefined) {
      validateStringLength(args.description, "Project description", 0, 500);
      validateNoXSS(args.description, "Project description");
    }

    if (args.budget !== undefined) {
      validateBudget(args.budget.total, args.budget.spent);
    }

    const { id, sessionId, ...updates } = args;
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
  args: { id: v.id("projects"), sessionId: v.string() },
  handler: async (ctx, args) => {
    // Verify ownership
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const room of rooms) {
      for (const photo of room.photos) {
        await ctx.storage.delete(photo.storageId);
      }

      const analyses = await ctx.db
        .query("analyses")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const analysis of analyses) {
        await ctx.db.delete(analysis._id);
      }

      const recommendations = await ctx.db
        .query("recommendations")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const rec of recommendations) {
        await ctx.db.delete(rec._id);
      }

      const visualizations = await ctx.db
        .query("visualizations")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const vis of visualizations) {
        if (vis.output?.storageId) {
          await ctx.storage.delete(vis.output.storageId);
        }
        await ctx.db.delete(vis._id);
      }

      await ctx.db.delete(room._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Internal mutation for cleanup jobs - no session validation required
export const internalRemove = internalMutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return; // Already deleted

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const room of rooms) {
      for (const photo of room.photos) {
        await ctx.storage.delete(photo.storageId);
      }

      const analyses = await ctx.db
        .query("analyses")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const analysis of analyses) {
        await ctx.db.delete(analysis._id);
      }

      const recommendations = await ctx.db
        .query("recommendations")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const rec of recommendations) {
        await ctx.db.delete(rec._id);
      }

      const visualizations = await ctx.db
        .query("visualizations")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const vis of visualizations) {
        if (vis.output?.storageId) {
          await ctx.storage.delete(vis.output.storageId);
        }
        await ctx.db.delete(vis._id);
      }

      await ctx.db.delete(room._id);
    }

    await ctx.db.delete(args.id);
  },
});
