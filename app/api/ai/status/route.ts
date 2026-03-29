import { NextResponse } from "next/server";

import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";

function buildFallbackPayload() {
  const snapshot = getAiCapabilitySnapshot();

  return {
    ok: true as const,
    provider: snapshot.provider,
    model: snapshot.model,
    hasApiKey: snapshot.hasApiKey,
    webSearchEnabled: snapshot.webSearchEnabled,
    canGeneratePaperDraft: snapshot.hasApiKey,
    canUseWebSearch: snapshot.canUseWebSearch,
    models: {
      default: {
        connected: snapshot.hasApiKey,
        provider: snapshot.provider,
        latencyMs: null
      },
      gemini: {
        connected: Boolean(process.env.GEMINI_API_KEY),
        latencyMs: null
      }
    },
    source: "runtime-snapshot" as const
  };
}

export async function GET() {
  return NextResponse.json(buildFallbackPayload());
}
