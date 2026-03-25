import { NextResponse } from "next/server";

import { requestTextWithCurl } from "@/lib/curl-transport";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { probeModelConnection } from "@/lib/minimax-client";

export async function GET() {
  const snapshot = getAiCapabilitySnapshot();
  const modelConnected = await probeModelConnection();
  const webSearchConnected = snapshot.webSearchEnabled
    ? await probeWebSearchConnection()
    : false;

  return NextResponse.json({
    ok: true,
    provider: snapshot.provider,
    model: snapshot.model,
    baseUrl: snapshot.baseUrl,
    hasApiKey: snapshot.hasApiKey,
    webSearchEnabled: snapshot.webSearchEnabled,
    webSearchMode: snapshot.webSearchMode,
    canGeneratePaperDraft: modelConnected,
    canUseWebSearch: webSearchConnected,
    modelConnected,
    webSearchConnected,
    probedAt: new Date().toISOString()
  });
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
