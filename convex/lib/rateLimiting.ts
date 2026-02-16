import { QueryCtx, MutationCtx } from "../_generated/server";

// Rate limits per operation per session per hour
const RATE_LIMITS = {
  analysis: 10,
  recommendations: 20,
  visualization: 15,
} as const;

type Operation = keyof typeof RATE_LIMITS;

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if a session has exceeded their rate limit for an operation
 * @returns null if allowed, error message if rate limit exceeded
 */
export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  sessionId: string,
  operation: Operation
): Promise<string | null> {
  const now = Date.now();
  const limit = RATE_LIMITS[operation];

  // Find existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_session_operation", (q) =>
      q.eq("sessionId", sessionId).eq("operation", operation)
    )
    .first();

  if (!existing) {
    // No record exists - allowed
    return null;
  }

  // Check if window has expired
  if (now - existing.windowStart > WINDOW_MS) {
    // Window expired - allowed (will be reset by incrementRateLimit)
    return null;
  }

  // Check if count exceeds limit
  if (existing.count >= limit) {
    const timeRemaining = Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000 / 60);
    return `You've reached the hourly limit for ${operation}. Try again in ${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''}.`;
  }

  // Within limits
  return null;
}

/**
 * Increment the rate limit counter for a session/operation
 */
export async function incrementRateLimit(
  ctx: MutationCtx,
  sessionId: string,
  operation: Operation
): Promise<void> {
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_session_operation", (q) =>
      q.eq("sessionId", sessionId).eq("operation", operation)
    )
    .first();

  if (!existing) {
    // Create new rate limit record
    await ctx.db.insert("rateLimits", {
      sessionId,
      operation,
      count: 1,
      windowStart: now,
      lastReset: now,
    });
    return;
  }

  // Check if window has expired
  if (now - existing.windowStart > WINDOW_MS) {
    // Reset window
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
      lastReset: now,
    });
    return;
  }

  // Increment count
  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}
