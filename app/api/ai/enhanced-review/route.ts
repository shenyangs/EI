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

    // 生成默认评审结果作为回退
    const defaultContent = `【增强版论文评审报告】

【整体评价】
论文整体结构完整，研究主题具有学术价值，但仍有改进空间。

【优点】
1. 研究方向明确，具有一定的创新性
2. 论文结构基本完整，逻辑清晰
3. 内容具有一定的学术深度

【主要问题】
1. 理论基础需要进一步加强
2. 实证支持不足，需要补充数据或案例
3. 学术表达需要更严谨、更克制
4. 文献引用不够充分

【详细评审意见】
1. 引言部分：研究背景描述不够充分，建议补充更多相关文献
2. 方法部分：研究方法描述需要更详细，增强可重复性
3. 结果部分：结果分析需要更深入，挖掘更深层次的含义
4. 结论部分：结论表述需要收束，明确指出研究局限性

【改进建议】
1. 强化理论基础，增加相关文献引用
2. 补充实证数据或案例支持
3. 优化语言表达，使其更符合学术规范
4. 检查逻辑结构，确保论证连贯

【说明】AI 服务暂时不可用，以上为通用评审意见。`;

    return NextResponse.json({
      ok: true,
      content: defaultContent,
      error: message,
      fallback: true
    });
  }
}
