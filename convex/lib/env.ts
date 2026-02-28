/**
 * Environment variable validation for Convex actions
 * Validates required API keys are present
 */

export function validateActionEnv(): void {
  const requiredVars = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    SERP_API_KEY: process.env.SERP_API_KEY,
  };

  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in Convex:\n${missing.map(v => `  - ${v}`).join("\n")}\n\n` +
      `These must be set in the Convex Dashboard under Settings > Environment Variables.`
    );
  }

  // Validate API key formats
  if (requiredVars.OPENAI_API_KEY && !requiredVars.OPENAI_API_KEY.startsWith("sk-")) {
    throw new Error(`Invalid OPENAI_API_KEY format. Must start with "sk-"`);
  }

}

// Export validated env vars
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY!,
  SERP_API_KEY: process.env.SERP_API_KEY!,
};
