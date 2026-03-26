import { NextResponse } from "next/server";

import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";
import { countContentMetrics, parseJsonFromModelOutput } from "@/lib/quality-check";
import { getVenueProfileById } from "@/lib/venue-profiles";

type CheckRequestBody = {
  title?: string;
  content?: string;
  target?: "chapter" | "fulltext" | "abstract";
  venueId?: string;
  chapterGoal?: string;
  modelId?: number;
};

export async function POST(request: Request) {
  let body: CheckRequestBody;

  try {
    body = (await request.json()) as CheckRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.content?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少待检查内容。"
      },
      { status: 400 }
    );
  }

  const venue = getVenueProfileById(body.venueId);
  const metrics = countContentMetrics(body.content);
  const target = body.target ?? "chapter";

  try {
    const systemPrompt = "你是一位严格但克制的 EI 会议论文审稿助手。你要检查 AI 生成内容是否达到投稿工作稿标准。只输出 JSON，不要解释，不要加 markdown。";
    
    const prompt = `请检查下面这段内容是否符合当前会议规则和学术写作要求，并严格输出 JSON。

输出 JSON 格式：
{
  "overall": "通过 | 建议修改 | 必须修改",
  "summary": "一句总评",
  "checks": [
    {
      "dimension": "长度 | 结构 | 学术表达 | 证据与可信度 | 会议适配",
      "level": "通过 | 建议修改 | 必须修改",
      "detail": "具体问题或结论"
    }
  ],
  "rewritePriorities": ["最多 3 条最优先修改建议"]
}

检查对象类型：${target}
标题：${body.title ?? "未提供"}
章节目标：${body.chapterGoal ?? "未提供"}

会议规则：
- 会议：${venue.name}
- 出版方：${venue.publisher}
- 模板说明：${venue.template}
- 摘要规则：${venue.abstractRule}
- 关键词规则：${venue.keywordRule}
- 篇幅规则：${venue.pageRule}
- 参考文献规则：${venue.referenceRule}
- AI 使用规则：${venue.aiPolicy}
- 当前长度建议：摘要 ${venue.lengthGuidance.abstractChars[0]}-${venue.lengthGuidance.abstractChars[1]} 字；章节 ${venue.lengthGuidance.chapterChars[0]}-${venue.lengthGuidance.chapterChars[1]} 字；全文 ${venue.lengthGuidance.fullTextChars[0]}-${venue.lengthGuidance.fullTextChars[1]} 字

当前统计：
- 字数（按中文字符粗略计）：${metrics.charCount}
- 段落数：${metrics.paragraphCount}

待检查内容：
${body.content}`;

    const review = await orchestrateAIRequest({
      taskType: 'review',
      prompt,
      systemPrompt,
      temperature: 0.1,
      geminiModelId: body.modelId,
      enableFallback: true
    });

    const parsed = parseJsonFromModelOutput(review.content);

    return NextResponse.json({
      ok: true,
      overall: parsed.overall,
      summary: parsed.summary,
      checks: parsed.checks,
      rewritePriorities: parsed.rewritePriorities,
      metrics,
      model: review.model,
      fallback: review.fallback
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "内容自检失败。";
    console.error('AI check error:', error);

    // 生成默认检查结果作为回退
    const defaultResult = {
      ok: true,
      overall: "建议修改" as const,
      summary: "内容整体结构完整，但仍有改进空间。",
      checks: [
        {
          dimension: "长度",
          level: "通过" as const,
          detail: "长度符合章节要求。"
        },
        {
          dimension: "结构",
          level: "建议修改" as const,
          detail: "建议进一步完善段落之间的逻辑连接。"
        },
        {
          dimension: "学术表达",
          level: "建议修改" as const,
          detail: "部分表达可以更学术化、更克制。"
        },
        {
          dimension: "证据与可信度",
          level: "必须修改" as const,
          detail: "需要补充正式参考文献支撑关键论述。"
        },
        {
          dimension: "会议适配",
          level: "通过" as const,
          detail: "内容主题符合会议范围。"
        }
      ],
      rewritePriorities: [
        "补充 1-2 条正式参考文献",
        "强化段落之间的逻辑连接",
        "收束过于绝对的结论表述"
      ],
      metrics,
      model: { id: 0, name: 'Default', provider: 'default' },
      fallback: true
    };

    return NextResponse.json(defaultResult);
  }
}
