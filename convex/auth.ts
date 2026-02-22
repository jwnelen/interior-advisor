import { query } from "./_generated/server";

/**
 * Get the current authenticated user's identity
 * Returns null if user is not authenticated
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

/**
 * Helper function to get userId from auth context
 * Throws an error if user is not authenticated
 */
export async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity.subject;
}

/**
 * Helper function to optionally get userId from auth context
 * Returns null if user is not authenticated
 */
export async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}
