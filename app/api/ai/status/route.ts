import { NextResponse } from "next/server";

import { requestTextWithCurl } from "@/lib/curl-transport";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { getDefaultModel, probeModelConnection } from "@/lib/ai/ai-client";
import { getDatabase } from "@/lib/server/db";
import { isCertificateChainError, requestTextWithCurl as curlRequest } from "@/lib/curl-transport";

// 从环境变量创建默认模型配置
function createDefaultModelFromEnv(): any {
  const provider = process.env.AI_PROVIDER || "minimax";
  const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
  const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  return {
    id: 0,
    name: "默认模型",
    provider,
    model,
    baseUrl,
    apiKey,
    isDefault: true,
    createdAt: new Date().toISOString()
  };
}

// 从环境变量创建Gemini模型配置
function createGeminiModelFromEnv(): any {
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

// 测试模型连接（支持环境变量配置）
async function testModelConnection(model: any): Promise<boolean> {
  if (!model || !model.apiKey) {
    return false;
  }
  
  try {
    let endpoint: string;
    let body: any;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`
    };
    
    if (model.provider === 'google') {
      // Gemini API 格式
      endpoint = `${model.baseUrl.replace(/\/$/, '')}/models/${model.model}:generateContent?key=${model.apiKey}`;
      body = {
        contents: [
          {
            role: 'user',
            parts: [{ text: '连通性检测' }]
          }
        ],
        generationConfig: { temperature: 0 }
      };
      // Gemini 使用 query param 传递 key，不在 header 中
      headers = { 'Content-Type': 'application/json' };
    } else {
      // OpenAI 兼容格式
      endpoint = `${model.baseUrl.replace(/\/$/, '')}/chat/completions`;
      body = {
        model: model.model,
        temperature: 0,
        max_tokens: 8,
        messages: [
          { role: 'system', content: '你是连通性检测助手，只回复一个"通"字。' },
          { role: 'user', content: '连通性检测' }
        ]
      };
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store'
      });
      
      if (response.ok) {
        return true;
      }
      
      // 如果失败且有证书问题，尝试使用 curl
      const errorText = await response.text();
      if (errorText.includes('certificate') || errorText.includes('SSL')) {
        throw new Error('Certificate error');
      }
      return false;
    } catch (error) {
      if (isCertificateChainError(error)) {
        const { status } = await curlRequest({
          url: endpoint,
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          timeoutSeconds: 10
        });
        return status >= 200 && status < 300;
      }
      throw error;
    }
  } catch (error) {
    console.error(`Failed to test ${model.provider} connection:`, error);
    return false;
  }
}

export async function GET() {
  const snapshot = getAiCapabilitySnapshot();
  
  // 1. 尝试从数据库获取默认模型
  let defaultModel = await getDefaultModel();
  let modelConnected = false;
  
  // 2. 如果数据库没有，使用环境变量配置
  if (!defaultModel) {
    defaultModel = createDefaultModelFromEnv();
  }
  
  // 3. 测试模型连接
  if (defaultModel) {
    modelConnected = await testModelConnection(defaultModel);
  }
  
  // 4. 检测Gemini模型状态（数据库或环境变量）
  let geminiModel = null;
  let geminiConnected = false;
  
  try {
    const db = await getDatabase();
    const models = await db.all('SELECT * FROM ai_models WHERE provider = ?', ['google']);
    if (models.length > 0) {
      geminiModel = models[0];
    }
  } catch (error) {
    console.error('Failed to query Gemini from database:', error);
  }
  
  // 如果数据库没有，使用环境变量
  if (!geminiModel) {
    geminiModel = createGeminiModelFromEnv();
  }
  
  if (geminiModel) {
    geminiConnected = await testModelConnection(geminiModel);
  }
  
  // 5. 检测联网搜索
  const webSearchConnected = snapshot.webSearchEnabled
    ? await probeWebSearchConnection()
    : false;

  // 6. 确定最终显示的模型信息
  const activeModel = defaultModel || geminiModel;
  const isConnected = modelConnected || geminiConnected;
  
  return NextResponse.json({
    ok: true,
    provider: activeModel?.provider || snapshot.provider,
    model: activeModel?.model || snapshot.model,
    hasApiKey: !!(activeModel?.apiKey || snapshot.hasApiKey),
    webSearchEnabled: snapshot.webSearchEnabled,
    canGeneratePaperDraft: isConnected,
    canUseWebSearch: webSearchConnected,
    models: {
      default: { connected: modelConnected, provider: defaultModel?.provider },
      gemini: { connected: geminiConnected }
    }
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
