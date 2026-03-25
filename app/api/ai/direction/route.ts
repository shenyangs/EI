import { NextResponse } from 'next/server';
import { generateDirection } from '@/lib/ai/ai-orchestrator';

type DirectionRequestBody = {
  topic?: string;
  field?: string;
  modelId?: number;
};

export async function POST(request: Request) {
  let body: DirectionRequestBody;

  try {
    body = (await request.json()) as DirectionRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: '请求体不是合法 JSON。'
      },
      { status: 400 }
    );
  }

  if (!body.topic) {
    return NextResponse.json(
      {
        ok: false,
        error: '缺少 topic。'
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateDirection(body.topic, body.field, body.modelId);

    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      model: result.model,
      fallback: result.fallback,
      originalProvider: result.originalProvider
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型调用失败。';

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
