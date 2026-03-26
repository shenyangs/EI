import { NextResponse } from "next/server";
import { generateDirectionEnhanced } from "@/lib/ai/ai-orchestrator";
import type { PromptContext } from "@/lib/ai/prompt-engine";

/**
 * 增强版研究方向生成API
 * 使用新的AI驱动Prompt系统，生成高质量、深度化的研究方向
 * 
 * POST /api/ai/enhanced-direction
 * 
 * 请求体：
 * {
 *   topic: string;           // 研究主题（必填）
 *   keywords: string[];      // 关键词（必填）
 *   domain?: string;         // 领域（可选，自动检测）
 *   targetVenue?: string;    // 目标会议/期刊（可选）
 *   userLevel?: string;      // 用户水平（可选，默认master）
 * }
 * 
 * 响应：
 * {
 *   ok: true,
 *   content: string;         // 生成的研究方向内容
 *   quality: {
 *     score: number;         // 质量评分（0-10）
 *     passed: boolean;       // 是否通过质量检查
 *     iterations: number;    // 迭代次数
 *   },
 *   metadata: {
 *     domain: string;        // 检测到的领域
 *     generationTime: number;// 生成时间（ms）
 *     selfCritique?: string; // 自我批评（可选）
 *   }
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, keywords, domain, targetVenue, userLevel } = body;

    // 参数验证
    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少研究主题（topic）" },
        { status: 400 }
      );
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { ok: false, error: "缺少关键词（keywords）" },
        { status: 400 }
      );
    }

    // 调用增强版生成函数
    const result = await generateDirectionEnhanced(topic, keywords, {
      domain: domain as PromptContext["domain"],
      targetVenue,
      userLevel: (userLevel as PromptContext["userLevel"]) || "master",
    });

    return NextResponse.json({
      ok: true,
      content: result.content,
      quality: result.quality,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Enhanced direction generation failed:", error);
    
    const message = error instanceof Error ? error.message : "生成研究方向失败";

    // 生成默认研究方向作为回退
    const defaultContent = `【增强版研究方向建议】

1. **理论研究方向**
   深入研究相关理论基础，构建系统的理论框架。重点关注领域内的核心理论问题，为后续研究奠定坚实基础。

2. **实证研究方向**
   通过数据收集和分析，验证研究假设。建议采用定量与定性相结合的方法，确保研究结论的可靠性。

3. **应用研究方向**
   关注研究成果的实际应用价值，探索在具体场景中的应用可能性。建议与行业实践相结合，提升研究的实用价值。

4. **跨学科研究方向**
   融合多学科知识和方法，从多角度探讨研究问题。建议关注学科交叉点，寻找创新突破口。

5. **方法创新方向**
   探索新的研究方法或改进现有方法，提升研究的科学性和有效性。建议关注前沿方法学发展。

【说明】
AI 服务暂时不可用，以上为通用研究方向建议。如需更精准的建议，请提供详细的研究背景和具体需求。`;

    return NextResponse.json({
      ok: true,
      content: defaultContent,
      error: message,
      fallback: true
    });
  }
}
