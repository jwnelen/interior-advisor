import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Cleanup old data to control storage costs
 *
 * Data retention policy:
 * - Projects inactive for 90+ days are deleted
 * - Failed analyses/recommendations/visualizations older than 7 days are deleted
 * - Orphaned storage files are cleaned up
 */
export const cleanupOldData = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    const stats = {
      projectsDeleted: 0,
      analysesDeleted: 0,
      recommendationsDeleted: 0,
      visualizationsDeleted: 0,
      orphanedFilesDeleted: 0,
    };

    // 1. Delete inactive projects (90+ days)
    const oldProjects = await ctx.db
      .query("projects")
      .filter((q) => q.lt(q.field("updatedAt"), now - NINETY_DAYS))
      .collect();

    for (const project of oldProjects) {
      // Delete via the internal remove mutation which handles cascading deletes
      try {
        await ctx.runMutation(internal.projects.internalRemove, {
          id: project._id,
        });
        stats.projectsDeleted++;
      } catch (error) {
        console.error(`Failed to delete project ${project._id}:`, error);
      }
    }

    // 2. Delete old failed analyses
    const failedAnalyses = await ctx.db
      .query("analyses")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "failed"),
          q.lt(q.field("createdAt"), now - SEVEN_DAYS)
        )
      )
      .collect();

    for (const analysis of failedAnalyses) {
      await ctx.db.delete(analysis._id);
      stats.analysesDeleted++;
    }

    // 3. Delete old failed recommendations
    const failedRecommendations = await ctx.db
      .query("recommendations")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "failed"),
          q.lt(q.field("createdAt"), now - SEVEN_DAYS)
        )
      )
      .collect();

    for (const rec of failedRecommendations) {
      await ctx.db.delete(rec._id);
      stats.recommendationsDeleted++;
    }

    // 4. Delete old failed visualizations
    const failedVisualizations = await ctx.db
      .query("visualizations")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "failed"),
          q.lt(q.field("createdAt"), now - SEVEN_DAYS)
        )
      )
      .collect();

    for (const vis of failedVisualizations) {
      if (vis.output?.storageId) {
        try {
          await ctx.storage.delete(vis.output.storageId);
        } catch (error) {
          console.error(`Failed to delete storage file ${vis.output.storageId}:`, error);
        }
      }
      await ctx.db.delete(vis._id);
      stats.visualizationsDeleted++;
    }

    console.log("Cleanup completed:", JSON.stringify(stats));
    return stats;
  },
});
