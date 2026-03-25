import { getAiRuntimeConfig } from "@/lib/ai-runtime";
import { isCertificateChainError, requestTextWithCurl } from "@/lib/curl-transport";

type GeneratePaperDraftInput = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function stripThinkingBlocks(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
}

async function requestMiniMax(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>
) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`MiniMax 请求失败：${response.status} ${text}`);
    }

    return JSON.parse(text) as OpenAiCompatibleResponse;
  } catch (error) {
    if (!isCertificateChainError(error)) {
      throw error;
    }

    const { status, text } = await requestTextWithCurl({
      url: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      timeoutSeconds: 30
    });

    if (status < 200 || status >= 300) {
      throw new Error(`MiniMax 请求失败：${status} ${text}`);
    }

    return JSON.parse(text) as OpenAiCompatibleResponse;
  }
}

export async function generatePaperDraft({
  prompt,
  systemPrompt,
  temperature = 0.5
}: GeneratePaperDraftInput) {
  const config = getAiRuntimeConfig();

  if (!config.hasApiKey || !process.env.MINIMAX_API_KEY) {
    throw new Error("尚未配置 MINIMAX_API_KEY，请先在本地 .env.local 中填写。");
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const data = await requestMiniMax(endpoint, process.env.MINIMAX_API_KEY, {
    model: config.model,
    temperature,
    messages: [
      {
        role: "system",
        content:
          systemPrompt ??
          "你是一个面向服装、设计、时尚、人文社科与技术交叉研究的 EI 论文写作助手。输出必须结构清晰、学术表达克制，不编造引用，不要输出思考过程、推理标签或<think>内容。"
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  const content = rawContent ? stripThinkingBlocks(rawContent) : "";

  if (!content) {
    throw new Error("MiniMax 返回成功，但没有拿到正文内容。");
  }

  return {
    content,
    usage: data.usage ?? null
  };
}

export async function probeModelConnection() {
  const config = getAiRuntimeConfig();

  if (!config.hasApiKey || !process.env.MINIMAX_API_KEY) {
    return false;
  }

  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  try {
    const data = await requestMiniMax(endpoint, process.env.MINIMAX_API_KEY, {
      model: config.model,
      temperature: 0,
      max_tokens: 8,
      messages: [
        {
          role: "system",
          content: "你是连通性检测助手，只回复一个“通”字。"
        },
        {
          role: "user",
          content: "连通性检测"
        }
      ]
    });
    const content = data.choices?.[0]?.message?.content?.trim();

    return Boolean(content);
  } catch {
    return false;
  }
}
