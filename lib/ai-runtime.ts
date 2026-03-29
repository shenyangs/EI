import { getPublicSystemRuntime } from "@/lib/server/admin-governance";

export type AiProvider = "google" | "minimax" | "openai" | "custom";
export type WebSearchMode = "disabled" | "minimax_mcp" | "custom";

export type AiRuntimeConfig = {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  webSearchEnabled: boolean;
  webSearchMode: WebSearchMode;
};

function normalizeBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getAiRuntimeConfig(): AiRuntimeConfig {
  const requestedProvider = (process.env.AI_PROVIDER ?? (process.env.GEMINI_API_KEY ? "google" : "minimax")).toLowerCase();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasMiniMaxKey = Boolean(process.env.MINIMAX_API_KEY);
  const wantsGemini = requestedProvider === "google" || requestedProvider === "gemini";

  let provider: AiProvider;
  if (wantsGemini && hasGeminiKey) {
    provider = "google";
  } else if (!wantsGemini && hasMiniMaxKey) {
    provider = "minimax";
  } else if (hasMiniMaxKey) {
    provider = "minimax";
  } else if (hasGeminiKey) {
    provider = "google";
  } else {
    provider = wantsGemini ? "google" : "minimax";
  }

  const isGemini = provider === "google";
  const model = isGemini
    ? process.env.GEMINI_MODEL ?? "gemini-pro"
    : process.env.MINIMAX_MODEL ?? "MiniMax-M2.7";
  const baseUrl = isGemini
    ? process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
    : process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1";
  const systemRuntime = getPublicSystemRuntime();
  const webSearchEnabled = normalizeBoolean(process.env.ENABLE_WEB_SEARCH, true) && systemRuntime.webSearchEnabled;
  const webSearchMode = (process.env.WEB_SEARCH_MODE ?? "minimax_mcp") as WebSearchMode;

  return {
    provider,
    model,
    baseUrl,
    hasApiKey: isGemini ? hasGeminiKey : hasMiniMaxKey,
    webSearchEnabled,
    webSearchMode: webSearchEnabled ? webSearchMode : "disabled"
  };
}

export function getAiCapabilitySnapshot() {
  const config = getAiRuntimeConfig();

  return {
    ...config,
    canGeneratePaperDraft: config.hasApiKey,
    canUseWebSearch: config.hasApiKey && config.webSearchEnabled
  };
}
