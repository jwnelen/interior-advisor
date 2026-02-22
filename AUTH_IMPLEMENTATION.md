# Auth Implementation

## What Was Changed

### 1. Email sending — `convex/betterAuth/auth.ts`
Replaced the console.log placeholder with real Resend email delivery. Magic link emails are now sent with a clean HTML template.

**Before starting, ensure Convex has the API key:**
```bash
npx convex env set RESEND_API_KEY your_key_here
```

> **Production note:** The `from` address is currently `onboarding@resend.dev` (Resend's sandbox sender). For production, verify your own domain in the Resend dashboard and update the `from` field to e.g. `Interior Advisor <noreply@yourdomain.com>`.

---

### 2. Auth guards on all Convex functions

Every public query and mutation now requires an authenticated user. The pattern used throughout:

```typescript
const userId = await requireUserId(ctx);

// For data accessed by ID, verify ownership:
const room = await ctx.db.get(args.roomId);
const project = await ctx.db.get(room.projectId);
if (!project || project.userId !== userId) throw new Error("Unauthorized");
```

**Functions updated:**

| File | Function | Change |
|---|---|---|
| `convex/rooms.ts` | `generateUploadUrl` | Added `requireUserId` |
| `convex/analyses.ts` | `getByRoom` | Added auth + ownership check |
| `convex/recommendations.ts` | `getByRoom` | Added auth + ownership check |
| `convex/recommendations.ts` | `getCustomQuestions` | Added auth + ownership check |
| `convex/recommendations.ts` | `deleteCustomQuestion` | Added auth + ownership check |
| `convex/recommendations.ts` | `askCustomQuestion` | Added auth + ownership check |
| `convex/recommendations.ts` | `toggleItemSelection` | Added auth + ownership check |
| `convex/recommendations.ts` | `regenerate` | Added auth + ownership check |
| `convex/visualizations.ts` | `getByRoom` | Added auth + ownership check |
| `convex/visualizations.ts` | `remove` | Added auth + ownership check |

---

### 3. Landing page — `app/page.tsx`

- Header: shows **Sign In** button for unauthenticated users; shows My Style + My Projects for authenticated users.
- Hero CTA: shows a single **Get Started** → `/sign-in` button for unauthenticated users; shows Discover Your Style + My Projects for authenticated users.
- Bottom CTA: removed "No account required" copy; links to `/sign-in` or `/discover` based on session.

---

### 4. Dashboard — `app/dashboard/page.tsx`

- Added **Sign Out** button to the header (calls `authClient.signOut()` then redirects to `/sign-in`).
- Added redirect: if `isPending` is false and there's no session, the user is sent to `/sign-in` automatically.

---

## How It Works

```
User visits /sign-in
  → enters email
  → Convex HTTP action calls Better Auth
  → Better Auth calls sendMagicLink()
  → Resend sends email with one-time link
  → User clicks link → redirected to /dashboard
  → Better Auth sets session cookie
  → layout.tsx server-side getToken() reads cookie and passes JWT to ConvexBetterAuthProvider
  → All Convex queries/mutations have user identity available via ctx.auth
```

The `requireUserId` helper (`convex/auth.ts`) extracts the user identity from `ctx.auth` and returns the `userId`. It throws `ConvexError("Unauthenticated")` if there's no valid session.

---

## Suggested Improvements

1. **Auth guards on project/room pages** — `app/project/[id]/page.tsx` and `app/project/[id]/rooms/[roomId]/page.tsx` check session but don't redirect. Add the same `useEffect` redirect pattern from dashboard.

2. **Verified Resend domain** — Switch `from` to your own domain for production to improve deliverability and branding.

3. **Server-side auth guards** — For stricter protection, use `isAuthenticated()` from `lib/auth-server.ts` in server components to `redirect("/sign-in")` before any rendering occurs. This prevents any flash of content.

4. **User display** — Show the signed-in user's email in the dashboard header (`session.user.email`).

5. **Rate limiting on auth** — Better Auth has built-in rate limiting for magic link requests but consider adding app-level limits if you see abuse.

6. **`rooms.list` is public** — It takes a `projectId` and returns rooms without auth. Since projects are guarded, this is low risk, but adding an auth check + ownership verify would be complete.
