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
    
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
