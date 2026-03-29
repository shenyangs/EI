import { requestTextWithCurl } from "@/lib/curl-transport";
import { getAiCapabilitySnapshot, getAiRuntimeConfig } from "@/lib/ai-runtime";
import { getDefaultModel, type AIModel } from "@/lib/ai/ai-client";
import { getDatabase } from "@/lib/server/db";
import { isCertificateChainError, requestTextWithCurl as curlRequest } from "@/lib/curl-transport";

export type ModelProbeStatus = {
  connected: boolean;
  configured: boolean;
  latencyMs: number | null;
  checkedAt: string;
  error: string | null;
};

export type SystemModelStatusCard = {
  key: "minimax" | "gemini";
  name: string;
  provider: "minimax" | "google";
  model: string;
  baseUrl: string;
  configured: boolean;
  runtimeSelected: boolean;
  source: "system-default";
  status: ModelProbeStatus;
};

export type SystemModelProvider = "minimax" | "google";

export type AiStatusPayload = {
  ok: true;
  provider: string;
  model: string;
  hasApiKey: boolean;
  webSearchEnabled: boolean;
  canGeneratePaperDraft: boolean;
  canUseWebSearch: boolean;
  models: {
    default: { connected: boolean; provider?: string; latencyMs?: number | null };
    gemini: { connected: boolean; latencyMs?: number | null };
  };
};

function createMiniMaxModelFromEnv(): AIModel | null {
  const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
  const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    id: 0,
    name: "MiniMax",
    provider: "minimax",
    model,
    baseUrl,
    apiKey,
    isDefault: true,
    createdAt: new Date().toISOString()
  };
}

function createGeminiModelFromEnv(): AIModel | null {
  const model = process.env.GEMINI_MODEL || "gemini-pro";
  const baseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    id: 0,
    name: "Gemini",
    provider: "google",
    model,
    baseUrl,
    apiKey,
    isDefault: false,
    createdAt: new Date().toISOString()
  };
}

function createDefaultModelFromEnv(): AIModel | null {
  const provider = (process.env.AI_PROVIDER || "google").toLowerCase();

  if (provider === "google" || provider === "gemini") {
    return createGeminiModelFromEnv() || createMiniMaxModelFromEnv();
  }

  if (provider === "minimax") {
    return createMiniMaxModelFromEnv() || createGeminiModelFromEnv();
  }

  return createGeminiModelFromEnv() || createMiniMaxModelFromEnv();
}

function createProbeStatus(overrides?: Partial<ModelProbeStatus>): ModelProbeStatus {
  return {
    connected: false,
    configured: false,
    latencyMs: null,
    checkedAt: new Date().toISOString(),
    error: null,
    ...overrides
  };
}

export async function probeModelConnection(model: AIModel | null): Promise<ModelProbeStatus> {
  if (!model || !model.apiKey) {
    return createProbeStatus({ configured: false, error: "未配置 API Key" });
  }

  const startedAt = Date.now();

  try {
    let endpoint: string;
    let body: Record<string, unknown>;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.apiKey}`
    };

    if (model.provider === "google") {
      endpoint = `${model.baseUrl.replace(/\/$/, "")}/models/${model.model}:generateContent?key=${model.apiKey}`;
      body = {
        contents: [
          {
            role: "user",
            parts: [{ text: "连通性检测" }]
          }
        ],
        generationConfig: { temperature: 0 }
      };
      headers = { "Content-Type": "application/json" };
    } else {
      endpoint = `${model.baseUrl.replace(/\/$/, "")}/chat/completions`;
      body = {
        model: model.model,
        temperature: 0,
        max_tokens: 8,
        messages: [
          { role: "system", content: "你是连通性检测助手，只回复一个通字。" },
          { role: "user", content: "连通性检测" }
        ]
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store"
      });

      const latencyMs = Date.now() - startedAt;

      if (response.ok) {
        return createProbeStatus({
          connected: true,
          configured: true,
          latencyMs
        });
      }

      const errorText = await response.text();
      if (errorText.includes("certificate") || errorText.includes("SSL")) {
        throw new Error("Certificate error");
      }

      return createProbeStatus({
        configured: true,
        latencyMs,
        error: `HTTP ${response.status}`
      });
    } catch (error) {
      if (isCertificateChainError(error)) {
        const { status, text } = await curlRequest({
          url: endpoint,
          method: "POST",
          headers,
          body: JSON.stringify(body),
          timeoutSeconds: 10
        });
        const latencyMs = Date.now() - startedAt;

        if (status >= 200 && status < 300) {
          return createProbeStatus({
            connected: true,
            configured: true,
            latencyMs
          });
        }

        return createProbeStatus({
          configured: true,
          latencyMs,
          error: text ? `HTTP ${status}` : `HTTP ${status}`
        });
      }
      throw error;
    }
  } catch (error) {
    console.error(`Failed to test ${model.provider} connection:`, error);
    return createProbeStatus({
      configured: true,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "连接失败"
    });
  }
}

export function getSystemDefaultModelCards(): Omit<SystemModelStatusCard, "status">[] {
  const runtime = getAiRuntimeConfig();
  const minimax = createMiniMaxModelFromEnv();
  const gemini = createGeminiModelFromEnv();

  return [
    {
      key: "minimax",
      name: "MiniMax",
      provider: "minimax",
      model: minimax?.model || process.env.MINIMAX_MODEL || "MiniMax-M2.7",
      baseUrl: minimax?.baseUrl || process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1",
      configured: Boolean(minimax?.apiKey),
      runtimeSelected: runtime.provider === "minimax",
      source: "system-default"
    },
    {
      key: "gemini",
      name: "Gemini",
      provider: "google",
      model: gemini?.model || process.env.GEMINI_MODEL || "gemini-pro",
      baseUrl: gemini?.baseUrl || process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
      configured: Boolean(gemini?.apiKey),
      runtimeSelected: runtime.provider === "google",
      source: "system-default"
    }
  ];
}

export async function getSystemDefaultModelStatus(
  provider: SystemModelProvider
): Promise<SystemModelStatusCard> {
  const cards = getSystemDefaultModelCards();
  const card = cards.find((item) => item.provider === provider);

  if (!card) {
    throw new Error(`Unknown system model provider: ${provider}`);
  }

  const model =
    provider === "minimax" ? createMiniMaxModelFromEnv() : createGeminiModelFromEnv();

  const status = await probeModelConnection(model);

  return {
    ...card,
    status
  };
}

export async function getSystemDefaultModelStatuses(): Promise<SystemModelStatusCard[]> {
  const [minimax, google] = await Promise.all([
    getSystemDefaultModelStatus("minimax"),
    getSystemDefaultModelStatus("google")
  ]);

  return [minimax, google];
}

async function probeWebSearchConnection() {
  try {
    const response = await fetch("https://www.bing.com/search?q=EI+workbench+status", {
      cache: "no-store",
      signal: AbortSignal.timeout(6000)
    });

    return response.ok;
  } catch {
    try {
      const { status } = await requestTextWithCurl({
        url: "https://www.bing.com/search?q=EI+workbench+status",
        timeoutSeconds: 6
      });

      return status >= 200 && status < 400;
    } catch {
      return false;
    }
  }
}

export async function getAiStatusPayload(): Promise<AiStatusPayload> {
  const snapshot = getAiCapabilitySnapshot();

  let defaultModel = await getDefaultModel();
  if (!defaultModel) {
    defaultModel = createDefaultModelFromEnv();
  }

  const defaultProbe = await probeModelConnection(defaultModel);

  let geminiModel = null;

  try {
    const db = await getDatabase();
    const models = await db.all("SELECT * FROM ai_models WHERE provider = ?", ["google"]);
    if (models.length > 0) {
      geminiModel = models[0];
    }
  } catch (error) {
    console.error("Failed to query Gemini from database:", error);
  }

  if (!geminiModel) {
    geminiModel = createGeminiModelFromEnv();
  }

  const geminiProbe = await probeModelConnection(geminiModel);
  const webSearchConnected = snapshot.webSearchEnabled ? await probeWebSearchConnection() : false;
  const activeModel = defaultModel || geminiModel;
  const isConnected = defaultProbe.connected || geminiProbe.connected;

  return {
    ok: true,
    provider: activeModel?.provider || snapshot.provider,
    model: activeModel?.model || snapshot.model,
    hasApiKey: !!(activeModel?.apiKey || snapshot.hasApiKey),
    webSearchEnabled: snapshot.webSearchEnabled,
    canGeneratePaperDraft: isConnected,
    canUseWebSearch: webSearchConnected,
    models: {
      default: {
        connected: defaultProbe.connected,
        provider: defaultModel?.provider,
        latencyMs: defaultProbe.latencyMs
      },
      gemini: {
        connected: geminiProbe.connected,
        latencyMs: geminiProbe.latencyMs
      }
    }
  };
}
