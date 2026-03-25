import { NextResponse } from "next/server";

import { requestTextWithCurl } from "@/lib/curl-transport";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { getDefaultModel, probeModelConnection } from "@/lib/ai/ai-client";
import { getDatabase } from "@/lib/server/db";

export async function GET() {
  const snapshot = getAiCapabilitySnapshot();
  const defaultModel = await getDefaultModel();
  const modelConnected = defaultModel ? await probeModelConnection(defaultModel) : false;
  
  // 检测Gemini模型状态
  let geminiModel = null;
  let geminiConnected = false;
  try {
    const db = await getDatabase();
    const models = await db.all('SELECT * FROM ai_models WHERE provider = ?', ['google']);
    if (models.length > 0) {
      geminiModel = models[0];
      geminiConnected = await probeModelConnection(geminiModel);
    }
  } catch (error) {
    console.error('Failed to probe Gemini model:', error);
  }
  
  const webSearchConnected = snapshot.webSearchEnabled
    ? await probeWebSearchConnection()
    : false;

  return NextResponse.json({
    ok: true,
    provider: defaultModel?.provider || snapshot.provider,
    model: defaultModel?.model || snapshot.model,
    hasApiKey: !!defaultModel?.apiKey || snapshot.hasApiKey,
    webSearchEnabled: snapshot.webSearchEnabled,
    canGeneratePaperDraft: modelConnected,
    canUseWebSearch: webSearchConnected
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
