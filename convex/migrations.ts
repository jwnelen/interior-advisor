import { internalMutation, mutation } from "./_generated/server";

/**
 * Wipes all data from every table. Useful for resetting a deployment.
 * Call via HTTP: POST /api/mutation {"path":"migrations:deleteAllDataPublic","args":{}}
 */
export const deleteAllDataPublic = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "recommendations",
      "visualizations",
      "analyses",
      "rooms",
      "projects",
      "styleQuizResponses",
      "rateLimits",
      "apiUsageEvents",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }
    return counts;
  },
});

export const deleteAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "recommendations",
      "visualizations",
      "analyses",
      "rooms",
      "projects",
      "styleQuizResponses",
      "rateLimits",
      "apiUsageEvents",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }
    return counts;
  },
});
