"use client";

import { useSyncExternalStore } from "react";
import { v4 as uuidv4 } from "uuid";

const SESSION_KEY = "interior-advisor-session";

// Get or create session ID from localStorage
function getSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Cache the session ID since it won't change during the session
let cachedSessionId: string | null = null;

function getSnapshot(): string | null {
  if (cachedSessionId === null && typeof window !== "undefined") {
    cachedSessionId = getSessionId();
  }
  return cachedSessionId;
}

function getServerSnapshot(): null {
  return null;
}

// No-op subscribe since session ID doesn't change
const subscribe = () => () => {};

export function useLocalSession(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
