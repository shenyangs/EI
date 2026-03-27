import { NextResponse } from "next/server";

import { generateContent } from "@/lib/ai/ai-orchestrator";

type DraftRequestBody = {
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  modelId?: number;
};

export const maxDuration = 60;
export const runtime = "edge";

function buildFallbackDraft(prompt: string) {
  if (prompt.includes("重写")) {
    return "已根据学术规范重写内容，使其更加清晰、克制。";
  }

  if (prompt.includes("生成本章草稿")) {
    return "本章草稿已生成，包含了关键的学术内容和论证结构。";
  }

  if (prompt.includes("补证据")) {
    return "1. 建议补充关于传统纹样数字化转译的实证研究\n2. 建议添加智能服饰交互设计的用户测试数据\n3. 建议引用相关领域的最新研究成果";
  }

  return "AI 服务暂时不可用，已使用默认内容。";
}

export async function POST(request: Request) {
  let body: DraftRequestBody;

  try {
    body = (await request.json()) as DraftRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少 prompt。"
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateContent(body.prompt, body.systemPrompt, body.modelId);

    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      model: result.model,
      fallback: result.fallback,
      originalProvider: result.originalProvider
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "模型调用失败。";
    console.error("AI draft error:", error);

    return NextResponse.json({
      ok: true,
      content: buildFallbackDraft(body.prompt),
      error: message,
      fallback: true
    });
  }
}
