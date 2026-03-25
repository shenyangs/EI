export type AiProvider = "minimax" | "openai" | "custom";
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
  const provider = (process.env.AI_PROVIDER ?? "minimax") as AiProvider;
  const model = process.env.MINIMAX_MODEL ?? "MiniMax-M2.7";
  const baseUrl = process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1";
  const webSearchEnabled = normalizeBoolean(process.env.ENABLE_WEB_SEARCH, true);
  const webSearchMode = (process.env.WEB_SEARCH_MODE ?? "minimax_mcp") as WebSearchMode;

  return {
    provider,
    model,
    baseUrl,
    hasApiKey: Boolean(process.env.MINIMAX_API_KEY),
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
