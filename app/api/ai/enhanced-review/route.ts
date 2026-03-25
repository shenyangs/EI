import { NextResponse } from "next/server";
import { reviewContentEnhanced } from "@/lib/ai/ai-orchestrator";
import type { PromptContext } from "@/lib/ai/prompt-engine";

/**
 * 增强版论文评审API
 * 使用新的AI驱动Prompt系统，提供多维度、具体化的论文评审
 * 
 * POST /api/ai/enhanced-review
 * 
 * 请求体：
 * {
 *   content: string;         // 论文内容（必填）
 *   domain: string;          // 领域（必填）
 *   targetVenue?: string;    // 目标会议/期刊（可选）
 *   userLevel?: string;      // 用户水平（可选，默认phd）
 * }
 * 
 * 响应：
 * {
 *   ok: true,
 *   content: string;         // 详细评审报告
 *   quality: {
 *     score: number;         // 质量评分（0-10）
 *     passed: boolean;       // 是否通过质量检查
 *     iterations: number;    // 迭代次数
 *   },
 *   metadata: {
 *     domain: string;        // 领域
 *     generationTime: number;// 生成时间（ms）
 *     selfCritique?: string; // 自我批评（可选）
 *   }
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, domain, targetVenue, userLevel } = body;

    // 参数验证
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少论文内容（content）" },
        { status: 400 }
      );
    }

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少领域（domain）" },
        { status: 400 }
      );
    }

    // 验证domain是否有效
    const validDomains = [
      "fashion-design",
      "textile-engineering",
      "interaction-design",
      "digital-humanities",
      "cultural-heritage",
      "smart-clothing",
      "user-experience",
      "design-theory",
    ];

    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        {
          ok: false,
          error: `无效的domain，必须是以下之一: ${validDomains.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 调用增强版评审函数
    const result = await reviewContentEnhanced(content, {
      domain: domain as PromptContext["domain"],
      targetVenue,
      userLevel: (userLevel as PromptContext["userLevel"]) || "phd",
    });

    return NextResponse.json({
      ok: true,
      content: result.content,
      quality: result.quality,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Enhanced review failed:", error);

    const message = error instanceof Error ? error.message : "论文评审失败";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
