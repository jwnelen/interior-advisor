import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireUserId } from "./auth";

type AggregatedMetric = {
  name: string;
  requests: number;
  estimatedCostUsd: number;
};

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function toSortedMetrics(values: Map<string, { requests: number; estimatedCostUsd: number }>): AggregatedMetric[] {
  return Array.from(values.entries())
    .map(([name, metric]) => ({
      name,
      requests: metric.requests,
      estimatedCostUsd: roundUsd(metric.estimatedCostUsd),
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);
}

export const track = internalMutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("replicate")),
    model: v.string(),
    operation: v.union(
      v.literal("scene_analysis"),
      v.literal("recommendations"),
      v.literal("custom_question"),
      v.literal("visualization")
    ),
    status: v.union(v.literal("success"), v.literal("failed")),
    estimatedCostUsd: v.number(),
    units: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    roomId: v.optional(v.id("rooms")),
    projectId: v.optional(v.id("projects")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let projectId = args.projectId;

    if (!projectId && args.roomId) {
      const room = await ctx.db.get(args.roomId);
      projectId = room?.projectId;
    }

    let userId: string | undefined;
    if (projectId) {
      const project = await ctx.db.get(projectId);
      userId = project?.userId;
    }

    await ctx.db.insert("apiUsageEvents", {
      userId,
      projectId,
      roomId: args.roomId,
      provider: args.provider,
      model: args.model,
      operation: args.operation,
      status: args.status,
      estimatedCostUsd: roundUsd(args.estimatedCostUsd),
      units: args.units ?? 1,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

export const getMySummary = query({
  args: {
    days: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const periodDays = Math.max(1, Math.min(365, Math.floor(args.days ?? 30)));
    const startAt = now - periodDays * 24 * 60 * 60 * 1000;
    const recentLimit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 10)));

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Unauthorized");
      }
    }

    const events = args.projectId
      ? await ctx.db
          .query("apiUsageEvents")
          .withIndex("by_project_createdAt", (q) =>
            q.eq("projectId", args.projectId!).gte("createdAt", startAt)
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("apiUsageEvents")
          .withIndex("by_user_createdAt", (q) =>
            q.eq("userId", userId).gte("createdAt", startAt)
          )
          .order("desc")
          .collect();

    const byProvider = new Map<string, { requests: number; estimatedCostUsd: number }>();
    const byOperation = new Map<string, { requests: number; estimatedCostUsd: number }>();
    const byModel = new Map<string, { requests: number; estimatedCostUsd: number }>();

    let totalEstimatedCostUsd = 0;
    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    for (const event of events) {
      totalEstimatedCostUsd += event.estimatedCostUsd;
      totalRequests += 1;
      totalInputTokens += event.inputTokens ?? 0;
      totalOutputTokens += event.outputTokens ?? 0;
      totalTokens += event.totalTokens ?? 0;

      const providerStats = byProvider.get(event.provider) ?? { requests: 0, estimatedCostUsd: 0 };
      providerStats.requests += 1;
      providerStats.estimatedCostUsd += event.estimatedCostUsd;
      byProvider.set(event.provider, providerStats);

      const operationStats = byOperation.get(event.operation) ?? { requests: 0, estimatedCostUsd: 0 };
      operationStats.requests += 1;
      operationStats.estimatedCostUsd += event.estimatedCostUsd;
      byOperation.set(event.operation, operationStats);

      const modelStats = byModel.get(event.model) ?? { requests: 0, estimatedCostUsd: 0 };
      modelStats.requests += 1;
      modelStats.estimatedCostUsd += event.estimatedCostUsd;
      byModel.set(event.model, modelStats);
    }

    return {
      periodDays,
      startAt,
      endAt: now,
      totalEstimatedCostUsd: roundUsd(totalEstimatedCostUsd),
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      byProvider: toSortedMetrics(byProvider),
      byOperation: toSortedMetrics(byOperation),
      byModel: toSortedMetrics(byModel),
      recentEvents: events.slice(0, recentLimit),
    };
  },
});
