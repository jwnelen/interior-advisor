type OpenAITokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type OpenAIPrice = {
  inputPer1MUsd: number;
  outputPer1MUsd: number;
};

const DEFAULT_OPENAI_PRICING: Record<string, OpenAIPrice> = {
  "gpt-4o": {
    inputPer1MUsd: parsePrice(process.env.OPENAI_GPT4O_INPUT_PER_1M_USD, 2.5),
    outputPer1MUsd: parsePrice(process.env.OPENAI_GPT4O_OUTPUT_PER_1M_USD, 10),
  },
};

const DEFAULT_REPLICATE_PRICING_PER_UNIT_USD: Record<string, number> = {
  "google/nano-banana": parsePrice(process.env.REPLICATE_NANO_BANANA_PER_IMAGE_USD, 0.039),
};

function parsePrice(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function normalizeOpenAITokenUsage(
  usage:
    | {
        prompt_tokens?: number | null;
        completion_tokens?: number | null;
        total_tokens?: number | null;
      }
    | null
    | undefined
): OpenAITokenUsage {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

export function estimateOpenAICostUsd(model: string, usage: OpenAITokenUsage): number {
  const pricing = DEFAULT_OPENAI_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1MUsd;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1MUsd;
  return roundUsd(inputCost + outputCost);
}

export function estimateReplicateCostUsd(model: string, units = 1): number {
  const unitPrice = DEFAULT_REPLICATE_PRICING_PER_UNIT_USD[model];
  if (!unitPrice || units <= 0) return 0;
  return roundUsd(unitPrice * units);
}
