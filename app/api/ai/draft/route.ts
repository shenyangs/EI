import { NextResponse } from "next/server";

import { generatePaperDraft } from "@/lib/minimax-client";

type DraftRequestBody = {
  prompt?: string;
  systemPrompt?: string;
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
    const result = await generatePaperDraft({
      prompt: body.prompt,
      systemPrompt: body.systemPrompt
    });

    return NextResponse.json({
      ok: true,
      ...result
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
