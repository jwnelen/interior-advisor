/**
 * Environment variable validation for client-side
 * Validates at app startup to catch configuration issues early
 */

function validateEnv() {
  const requiredVars = {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  };

  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join("\n")}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.\n` +
      `See .env.local.example for reference.`
    );
  }

  // Validate format
  if (requiredVars.NEXT_PUBLIC_CONVEX_URL && !requiredVars.NEXT_PUBLIC_CONVEX_URL.startsWith("https://")) {
    throw new Error(
      `Invalid NEXT_PUBLIC_CONVEX_URL format. Must start with "https://"\n` +
      `Got: ${requiredVars.NEXT_PUBLIC_CONVEX_URL}`
    );
  }
}

// Run validation immediately
validateEnv();

// Export validated env vars
export const env = {
  CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL!,
};
