import { NextResponse } from "next/server";

import { AiOrchestrator } from "@/lib/ai/ai-orchestrator";

export async function POST(request: Request) {
  let body: {
    projectId?: string;
    content?: string;
    qualityReport?: any;
    venueId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法 JSON。" },
      { status: 400 }
    );
  }

  if (!body.projectId || !body.content || !body.qualityReport) {
    return NextResponse.json(
      { ok: false, error: "缺少必要参数。" },
      { status: 400 }
    );
  }

  try {
    // 使用 AI Orchestrator 生成改稿建议
    const context = {
      projectId: body.projectId,
      projectTitle: "论文改稿",
      venueId: body.venueId || "ieee-iccci-2026",
      currentStep: "revision",
      previousSteps: [],
      userInputs: {
        content: body.content,
        qualityReport: body.qualityReport
      }
    };

    // 调用 AI 生成改稿建议
    const revisions = await AiOrchestrator.generateRevisionSuggestions(
      body.content,
      body.qualityReport,
      context
    );

    return NextResponse.json({
      ok: true,
      revisions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成改稿建议失败";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
