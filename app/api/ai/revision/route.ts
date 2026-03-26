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

  // 验证内容长度，避免 token 超限
  if (body.content.length > 50000) {
    return NextResponse.json(
      { ok: false, error: "内容过长，请分段提交。" },
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
    console.error('AI revision error:', error);

    // 生成默认改稿建议作为回退
    const defaultRevisions = [
      {
        section: "全文",
        issue: "需要进一步加强学术性表达",
        suggestion: "建议使用更正式、更克制的学术语言，避免过于主观的表述",
        severity: "medium"
      },
      {
        section: "引言",
        issue: "研究背景描述不够充分",
        suggestion: "建议补充更多关于研究领域的背景信息和现状分析",
        severity: "medium"
      },
      {
        section: "方法",
        issue: "研究方法描述过于简略",
        suggestion: "建议详细说明数据收集和分析方法，增强可重复性",
        severity: "high"
      },
      {
        section: "结果",
        issue: "结果分析不够深入",
        suggestion: "建议加强对结果的解释和讨论，挖掘更深层次的含义",
        severity: "medium"
      },
      {
        section: "结论",
        issue: "结论表述过于绝对",
        suggestion: "建议收束结论表述，明确指出研究局限性",
        severity: "low"
      }
    ];

    return NextResponse.json({
      ok: true,
      revisions: defaultRevisions,
      error: message,
      fallback: true
    });
  }
}
