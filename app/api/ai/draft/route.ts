import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/ai-orchestrator";

type DraftRequestBody = {
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  modelId?: number;
};

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

  if (!body.prompt) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少 prompt。"
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateContent(
      body.prompt,
      body.systemPrompt,
      body.modelId
    );

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

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
