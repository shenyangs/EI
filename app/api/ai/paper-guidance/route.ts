import { NextResponse } from "next/server";
import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";
import { getPaperTypeById, type PaperCategory } from "@/lib/paper-type-profiles";

type GuidanceRequest = {
  paperType: PaperCategory;
};

export async function POST(request: Request) {
  let body: GuidanceRequest;

  try {
    body = (await request.json()) as GuidanceRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.paperType) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少论文类型参数。"
      },
      { status: 400 }
    );
  }

  const profile = getPaperTypeById(body.paperType);

  try {
    const systemPrompt = `你是一个专业的学术论文写作顾问，擅长为不同类型的论文提供针对性的写作指导。
请根据用户选择的论文类型，提供简洁、实用的写作建议。

论文类型信息：
- 名称：${profile.name}
- 分类：${profile.category}
- 描述：${profile.description}

格式要求：
- 摘要：${profile.requirements.abstract}
- 关键词：${profile.requirements.keywords}
- 篇幅：${profile.requirements.length}
- 结构：${profile.requirements.structure}

写作风格：
- 语调：${profile.writingStyle.tone}
- 深度：${profile.writingStyle.depth}
- 目标读者：${profile.writingStyle.audience}

请生成针对性的写作指导建议，要求：
1. 简洁明了，每条建议不超过2句话
2. 突出该类型论文的核心要点
3. 提供实用的写作技巧
4. 语言风格亲切友好`;

    const prompt = `请为"${profile.name}"提供针对性的写作指导建议，包括：
1. 核心要点（3-4条）
2. 写作技巧（3-4条）
3. 常见误区（2-3条）
4. 快速开始建议（2-3条）

请用简洁的列表形式输出，每条建议不超过2句话。`;

    const result = await orchestrateAIRequest({
      taskType: "strategy",
      prompt,
      systemPrompt,
      temperature: 0.7
    });

    const guidance = `【${profile.name}写作指导】

${result.content}

【推荐投稿平台】
${profile.suitableVenues.join(" · ")}`;

    return NextResponse.json({
      ok: true,
      guidance
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成引导建议失败。";

    const fallbackGuidance = `【${profile.name}写作指导】

【核心要点】
${profile.guidance.preparation.map((item, index) => `${index + 1}. ${item}`).join('\n')}

【写作技巧】
${profile.guidance.writing.map((item, index) => `${index + 1}. ${item}`).join('\n')}

【投稿建议】
${profile.guidance.submission.map((item, index) => `${index + 1}. ${item}`).join('\n')}

【推荐投稿平台】
${profile.suitableVenues.join(" · ")}`;

    return NextResponse.json({
      ok: true,
      guidance: fallbackGuidance
    });
  }
}
