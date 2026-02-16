# Interior Advisor

AI-powered interior design assistant. Upload room photos, get AI scene analysis, receive budget-aware recommendations, and visualize room transformations.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Convex (real-time BaaS — database, file storage, serverless functions)
- **Styling:** Tailwind CSS v4, shadcn/ui (New York style, lucide-react icons)
- **AI:** OpenAI GPT-4o (vision analysis + recommendations), Replicate SDXL (image generation)

## Prerequisites

- Node.js 18+ and npm
- Convex account (free tier available at [convex.dev](https://convex.dev))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))
- Replicate API key ([replicate.com](https://replicate.com))

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd interior-advisor
npm install
```

### 2. Set Up Convex

```bash
npx convex dev
```

This will:
- Prompt you to log in to Convex (or create an account)
- Create a new Convex project
- Generate your deployment URL

### 3. Configure Environment Variables

#### Local Development (.env.local)

Copy the example file:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Convex deployment URL (generated in step 2):

```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

#### API Keys (Convex Dashboard)

**IMPORTANT:** For security, API keys must be added in the Convex Dashboard, NOT in `.env.local`.

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings → Environment Variables**
4. Add the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key (starts with `sk-proj-...`)
   - `REPLICATE_API_TOKEN`: Your Replicate API token (starts with `r8_...`)

5. Restart `npx convex dev` after adding the keys

### 4. API Key Rotation

**CRITICAL:** If you cloned this repository and it contained API keys in `.env.local`, those keys have been exposed and MUST be rotated immediately:

1. **OpenAI:** Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys), revoke the old key, generate a new one
2. **Replicate:** Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens), revoke the old token, generate a new one
3. Add the new keys to Convex Dashboard (see step 3 above)

## Development

Run both the Next.js dev server and Convex backend simultaneously:

```bash
# Terminal 1: Run Convex backend
npx convex dev

# Terminal 2: Run Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Available Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx convex dev       # Start Convex backend in dev mode
npx convex deploy    # Deploy Convex to production
```

## Project Structure

```
interior-advisor/
├── app/                    # Next.js app directory (pages & routes)
│   ├── dashboard/         # Project management
│   ├── discover/          # Style discovery quiz
│   ├── project/[id]/      # Project & room management
│   └── style/             # User style profile
├── components/
│   ├── ui/                # shadcn/ui components
│   └── providers/         # Context providers
├── convex/                # Convex backend
│   ├── ai/                # AI pipeline (analysis, recommendations, visualization)
│   ├── schema.ts          # Database schema
│   └── *.ts               # Queries, mutations, actions
├── lib/
│   ├── hooks/             # React hooks
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
└── public/                # Static assets
```

## Features

- **Scene Analysis:** GPT-4o Vision analyzes room photos to identify furniture, lighting, colors, layout, and style
- **Budget-Aware Recommendations:** Two-tier system for quick wins (<$200) and transformations ($200-2000)
- **AI Visualizations:** Generate room transformation images using Replicate SDXL with ControlNet
- **Style Discovery:** Interactive quiz to help users discover their design preferences
- **Real-time Updates:** Convex provides instant UI updates without manual refetching
- **Anonymous Sessions:** No authentication required - uses localStorage for session management

## Production Deployment

See [CLAUDE.md](./CLAUDE.md) for detailed production deployment instructions including:
- Security best practices
- Environment variable setup
- Vercel deployment configuration
- Rate limiting and access control

## Contributing

This project uses:
- **ESLint** for code linting
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

## License

[Your License Here]
