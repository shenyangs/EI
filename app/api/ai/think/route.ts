import { NextResponse } from "next/server";
import { AiOrchestrator, AiTaskType, AiTaskContext } from "@/lib/ai/ai-orchestrator";

type ThinkRequest = {
  taskType: AiTaskType;
  content: string;
  context: AiTaskContext;
};

export async function POST(request: Request) {
  let body: ThinkRequest;

  try {
    body = (await request.json()) as ThinkRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.taskType || !body.content || !body.context) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少必要的任务类型、内容和上下文信息。"
      },
      { status: 400 }
    );
  }

  try {
    // 运行AI思考和内容生成流程
    const result = await AiOrchestrator.runTask(body.taskType, body.content, body.context);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 思考过程失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
