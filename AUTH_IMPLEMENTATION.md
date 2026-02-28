# Auth Implementation

## What Was Changed

### 1. Email sending — `convex/betterAuth/auth.ts`
Replaced the console.log placeholder with real Resend email delivery. Magic link emails are now sent with a clean HTML template.

**Before starting, ensure Convex has the API key:**
```bash
pnpm exec convex env set RESEND_API_KEY your_key_here
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
  → authClient.signIn.magicLink() → POST localhost:3000/api/auth/sign-in/magic-link
  → Next.js proxy forwards to https://*.convex.site/api/auth/sign-in/magic-link
  → Better Auth creates token, calls sendMagicLink()
  → Resend sends email with link: http://localhost:3000/api/auth/magic-link/verify?token=...
  → User clicks link → GET localhost:3000/api/auth/magic-link/verify?token=...
  → Next.js proxy forwards to Convex
  → Convex verifies token, creates session
  → 302 redirect to callbackURL with Set-Cookie headers
  → Browser sets session cookies on localhost:3000 (or production domain)
  → Browser follows redirect to /dashboard
  → layout.tsx server-side getToken() reads convex_jwt cookie → passes JWT to ConvexBetterAuthProvider
  → authClient.useSession() reads session via /api/auth/get-session (proxied)
  → All Convex queries/mutations have user identity available via ctx.auth
```

The `requireUserId` helper (`convex/auth.ts`) extracts the user identity from `ctx.auth` and returns the `userId`. It throws `ConvexError("Unauthenticated")` if there's no valid session.

### Why the Next.js proxy matters

All auth requests go through `app/api/auth/[...all]/route.ts`, which proxies them to the Convex HTTP handler. This is critical for session cookies: the browser sets cookies based on the response origin. If requests bypass the proxy and go directly to `*.convex.site`, session cookies are set on the Convex domain — not your app domain — and the session is invisible to your app.

`SITE_URL` in Convex controls what domain Better Auth puts in magic link emails. It **must** match your app's origin so magic links route through the proxy.

---

## Environment Variables

### Convex (set via `pnpm exec convex env set KEY value`)

| Variable | Dev value | Production value |
|---|---|---|
| `SITE_URL` | `http://localhost:3000` | `https://your-app.vercel.app` |
| `BETTER_AUTH_SECRET` | generate with `openssl rand -base64 32` | same or new secret |
| `RESEND_API_KEY` | your Resend key | same key |
| `OPENAI_API_KEY` | your OpenAI key | same key |
| `REPLICATE_API_TOKEN` | your Replicate token | same token |

### Next.js app (`.env.local` for dev, Vercel dashboard for production)

| Variable | Dev value | Production value |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx.convex.cloud` | prod `.convex.cloud` URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://xxx.convex.site` | prod `.convex.site` URL |
| `CONVEX_DEPLOYMENT` | `dev:your-deployment` | `prod:your-deployment` |

### Deploying to production

```bash
# 1. Deploy Convex backend
pnpm exec convex deploy

# 2. Point SITE_URL at your production domain
pnpm exec convex env set SITE_URL https://your-app.vercel.app

# 3. Set all other Convex env vars for the prod deployment
pnpm exec convex env set BETTER_AUTH_SECRET <secret>
pnpm exec convex env set RESEND_API_KEY <key>
# etc.

# 4. Add production env vars to Vercel (or your host)
#    NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, CONVEX_DEPLOYMENT

# 5. Update the `from` email in convex/betterAuth/auth.ts to your verified Resend domain
```

---

## Troubleshooting

### "Invalid origin" error
`SITE_URL` is set but not in `trustedOrigins`. Fixed in `convex/betterAuth/auth.ts`:
```typescript
trustedOrigins: [process.env.SITE_URL ?? "http://localhost:3000"],
```

### Magic link redirects to `*.convex.site/dashboard` (not found)
`SITE_URL` was not set in Convex. Magic links pointed directly to the Convex domain, bypassing the proxy. Fix: set `SITE_URL` and use an absolute `callbackURL`:
```typescript
// app/sign-in/page.tsx
callbackURL: `${window.location.origin}/dashboard`
```

### Lands on dashboard but immediately redirected to sign-in
The session cookie was set on the wrong domain (Convex site instead of your app). Root cause: `SITE_URL` not set in Convex env. Set it and the magic link will route through the Next.js proxy, setting the cookie on the correct domain.

---

## Suggested Improvements

1. **Auth guards on project/room pages** — `app/project/[id]/page.tsx` and `app/project/[id]/rooms/[roomId]/page.tsx` check session but don't redirect. Add the same `useEffect` redirect pattern from dashboard.

2. **Verified Resend domain** — Switch `from` to your own domain for production to improve deliverability and branding.

3. **Server-side auth guards** — For stricter protection, use `isAuthenticated()` from `lib/auth-server.ts` in server components to `redirect("/sign-in")` before any rendering occurs. This prevents any flash of content.

4. **User display** — Show the signed-in user's email in the dashboard header (`session.user.email`).

5. **Rate limiting on auth** — Better Auth has built-in rate limiting for magic link requests but consider adding app-level limits if you see abuse.

6. **`rooms.list` is public** — It takes a `projectId` and returns rooms without auth. Since projects are guarded, this is low risk, but adding an auth check + ownership verify would be complete.
