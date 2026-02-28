# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered interior design assistant. Users upload room photos, get AI scene analysis, receive budget-aware recommendations, and visualize room transformations.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Convex (real-time BaaS — database, file storage, serverless functions)
- **Styling:** Tailwind CSS v4, shadcn/ui (New York style, lucide-react icons)
- **AI:** OpenAI GPT-4o (vision analysis + recommendation text), Google Gemini (image generation)

## Commands

```bash
pnpm dev          # Start Next.js dev server (localhost:3000)
pnpm exec convex dev       # Start Convex backend in dev mode (run alongside Next.js)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm exec convex deploy    # Deploy Convex to production
```

Both `pnpm dev` and `pnpm exec convex dev` must run simultaneously during development.

## Architecture

### Data Flow

1. React components use Convex hooks (`useQuery`, `useMutation`) for real-time data
2. Mutations trigger internal actions via `scheduler.runAfter()` for AI processing
3. Internal actions call external APIs (OpenAI, Google Gemini), then write results back via `ctx.runMutation()`
4. UI updates automatically through Convex real-time subscriptions — no manual refetching needed

### AI Pipeline (3 stages)

1. **Scene Analysis** (`convex/ai/sceneAnalysis.ts`): GPT-4o Vision analyzes uploaded room photo → furniture, lighting, colors, layout, style
2. **Recommendations** (`convex/ai/advisor.ts`): GPT-4o generates two tiers — "quick_wins" (<$200, DIY) and "transformations" ($200-2000)
3. **Visualization** (`convex/ai/imageGeneration.ts`): Google Gemini generates room transformation images

### Session Management

No authentication — anonymous sessions via localStorage UUID (`interior-advisor-session`). All data is scoped by `sessionId`. The `useLocalSession()` hook in `lib/hooks/use-local-session.ts` handles this.

### Convex Function Types

- **Queries** (read-only, cached, real-time): `convex/projects.ts`, `convex/rooms.ts`, etc.
- **Mutations** (writes, transactional): same files, create/update/remove operations
- **Internal Actions** (`convex/ai/`): call external APIs, not directly callable from client

### Database Schema

Defined in `convex/schema.ts`. Key tables and their relationships:
- `projects` → has many `rooms` (via `projectId`)
- `rooms` → has many `analyses`, `recommendations`, `visualizations` (via `roomId`)
- `analyses` → feeds into `recommendations` (via `analysisId`)
- `styleQuizResponses` → linked by `sessionId`

All async operations (analyses, recommendations, visualizations) use status tracking: `pending` → `processing`/`generating` → `completed`/`failed`

### Key Directories

- `app/` — Next.js pages (landing, dashboard, discover quiz, project/room workspaces)
- `convex/` — Backend functions and schema. `convex/_generated/` is auto-generated (do not edit)
- `components/ui/` — shadcn/ui primitives
- `components/providers/` — Convex client provider
- `lib/` — Types (`types.ts`), constants (`constants.ts`), utilities (`utils.ts`), hooks

### Route Structure

- `/` — Landing page
- `/dashboard` — Project management
- `/discover` — Style discovery quiz (multi-step)
- `/project/[id]` — Project detail with room management
- `/project/[id]/rooms/[roomId]` — Room workspace (photo upload, analysis, recommendations, visualizations)

## Environment Variables

- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL (client-side)
- `CONVEX_DEPLOYMENT` — Convex project identifier
- `OPENAI_API_KEY` — Set in Convex dashboard, used by internal actions only
- `GOOGLE_GEMINI_API_KEY` — Set in Convex dashboard, used by internal actions only

See `.env.local.example` for template.

## Conventions

- Path alias: `@/*` maps to project root (e.g., `@/components/ui/button`)
- `next.config.ts` allowlists remote image domains for Convex storage
- Convex auto-generates types in `convex/_generated/` — import API from `convex/_generated/api`
