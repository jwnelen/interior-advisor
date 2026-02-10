"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useSyncExternalStore } from "react";

// Create client lazily on client-side only
function getConvexClient(): ConvexReactClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return null;
  }
  return new ConvexReactClient(convexUrl);
}

// Singleton client instance
let clientInstance: ConvexReactClient | null = null;

function getClient(): ConvexReactClient | null {
  if (clientInstance === null && typeof window !== "undefined") {
    clientInstance = getConvexClient();
  }
  return clientInstance;
}

// Subscribe function for useSyncExternalStore (no-op since client doesn't change)
const subscribe = () => () => {};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Use useSyncExternalStore to properly handle SSR/CSR
  const client = useSyncExternalStore(
    subscribe,
    getClient,
    () => null // Server snapshot
  );

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Convex Not Configured</h1>
          <p className="text-slate-500 mb-4">
            Run <code className="bg-slate-100 px-2 py-1 rounded">npx convex dev</code> to set up the backend.
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
