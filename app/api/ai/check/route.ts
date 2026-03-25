import { NextResponse } from "next/server";

import { generatePaperDraft } from "@/lib/minimax-client";
import { countContentMetrics, parseJsonFromModelOutput } from "@/lib/quality-check";
import { getVenueProfileById } from "@/lib/venue-profiles";

type CheckRequestBody = {
  title?: string;
  content?: string;
  target?: "chapter" | "fulltext" | "abstract";
  venueId?: string;
  chapterGoal?: string;
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
    const review = await generatePaperDraft({
      temperature: 0.1,
      systemPrompt:
        "你是一位严格但克制的 EI 会议论文审稿助手。你要检查 AI 生成内容是否达到投稿工作稿标准。只输出 JSON，不要解释，不要加 markdown。",
      prompt: `请检查下面这段内容是否符合当前会议规则和学术写作要求，并严格输出 JSON。

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
${body.content}`
    });

    const parsed = parseJsonFromModelOutput(review.content);

    return NextResponse.json({
      ok: true,
      overall: parsed.overall,
      summary: parsed.summary,
      checks: parsed.checks,
      rewritePriorities: parsed.rewritePriorities,
      metrics
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "内容自检失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
