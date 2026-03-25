import { NextResponse } from "next/server";

import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";
import {
  buildFallbackAdvisorBundle,
  parseAdvisorBundleFromModelOutput,
  type AdvisorModuleType
} from "@/lib/module-advisor";
import { getVenueProfileById } from "@/lib/venue-profiles";

type ModuleOptionsRequestBody = {
  moduleType?: AdvisorModuleType;
  projectTitle?: string;
  discipline?: string;
  venueId?: string;
  userNote?: string;
  modelId?: number;
};

export async function POST(request: Request) {
  let body: ModuleOptionsRequestBody;

  try {
    body = (await request.json()) as ModuleOptionsRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.projectTitle?.trim() || !body.moduleType) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少项目标题或模块类型。"
      },
      { status: 400 }
    );
  }

  const venue = getVenueProfileById(body.venueId);

  try {
    const systemPrompt = "你是一个只输出 JSON 的 EI 论文工作台策划助手。你的任务不是直接写论文，而是给出 3 组可供选择的模块方案。不要输出 markdown，不要解释。";
    
    const prompt = `请为论文工作台生成 3 组"${body.moduleType}"模块方案，并严格输出 JSON。

输出 JSON 格式：
{
  "summary": "一句总提示",
  "options": [
    {
      "label": "方案 A",
      "title": "简短标题",
      "reason": "为什么适合当前主题",
      "bullets": ["3 条以内要点"],
      "queries": ["仅当 moduleType=search 时提供 2-3 条英文检索词，否则不要输出该字段"]
    }
  ]
}

要求：
1. 一共只给 3 组方案。
2. 每组都要明显不同，不要只是同义改写。
3. bullects 必须具体，能指导下一步写作或搜文献。
4. 如果 moduleType=search，queries 要适合 OpenAlex / arXiv 学术检索，优先英文关键词组合。
5. 不要输出空话，不要输出超出 JSON 的内容。

当前论文主题：${body.projectTitle}
研究类型：${body.discipline ?? "未提供"}
目标会议：${venue.name}
会议规则：
- 模板：${venue.template}
- 摘要规则：${venue.abstractRule}
- 篇幅规则：${venue.pageRule}
- 引用规则：${venue.referenceRule}
- 适合方向：${venue.fitFor.join("、")}
用户补充想法：${body.userNote?.trim() || "暂无"}

moduleType 含义提示：
- methodology = 推荐方法组合
- materials = 优先补哪些材料与证据
- search = 先从哪些文献搜索角度切入`;

    const result = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt,
      temperature: 0.35,
      geminiModelId: body.modelId,
      enableFallback: true
    });

    const parsed = parseAdvisorBundleFromModelOutput(result.content, body.moduleType);

    return NextResponse.json({
      ok: true,
      ...parsed,
      model: result.model,
      fallback: result.fallback
    });
  } catch {
    const fallback = buildFallbackAdvisorBundle({
      moduleType: body.moduleType,
      projectTitle: body.projectTitle,
      discipline: body.discipline,
      userNote: body.userNote
    });

    return NextResponse.json({
      ok: true,
      ...fallback
    });
  }
}
