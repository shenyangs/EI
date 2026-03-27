import { NextResponse } from "next/server";

import { orchestrateAIRequest, AiOrchestrator } from "@/lib/ai/ai-orchestrator";
import { buildOutlineFallback } from "@/lib/outline-fallback";

type StreamRequestContext = {
  projectId?: string;
  projectTitle?: string;
  venueId?: string;
  currentStep?: string;
  previousSteps?: string[];
  prompt?: string;
  systemPrompt?: string;
  content?: string;
  qualityReport?: any;
  userInputs?: {
    selectedDirection?: string;
    directionDescription?: string;
  };
};

type StreamRequestBody = {
  taskType?: string;
  context?: StreamRequestContext;
};

type StreamPayload = {
  type: "thinking" | "content" | "quality" | "next_steps" | "revision" | "error";
  data: Record<string, unknown>;
};

type StreamTaskResult = Awaited<ReturnType<typeof resolveTask>>;

function createSseStream(start: (send: (payload: StreamPayload) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (payload: StreamPayload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        await start(send);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        send({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "Stream failed"
          }
        });
      } finally {
        controller.close();
      }
    }
  });
}

function chunkText(content: string, size = 160) {
  const chunks: string[] = [];

  for (let index = 0; index < content.length; index += size) {
    chunks.push(content.slice(index, index + size));
  }

  return chunks.length > 0 ? chunks : [content];
}

function buildRevisionContext(context: StreamRequestContext) {
  return {
    projectId: context.projectId || "unknown-project",
    projectTitle: context.projectTitle || "论文改稿",
    venueId: context.venueId || "ieee-iccci-2026",
    currentStep: context.currentStep || "revision",
    previousSteps: context.previousSteps || [],
    userInputs: {
      content: context.content,
      qualityReport: context.qualityReport
    }
  };
}

function hasRevisions(result: StreamTaskResult): result is Extract<StreamTaskResult, { revisions: unknown[] }> {
  return "revisions" in result && Array.isArray(result.revisions);
}

async function resolveTask(taskType: string, context: StreamRequestContext) {
  switch (taskType) {
    case "topic_analysis":
      return orchestrateAIRequest({
        taskType: "direction",
        prompt: `请为主题"${context.projectTitle}"生成 5 个具体的研究方向，每个方向包括名称、描述、研究价值和可行性分析。`,
        systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术方向顾问。基于用户提供的主题，生成 3-5 个具体的研究方向，每个方向包括：
1. 方向名称
2. 简要描述（1-2 句话）
3. 研究价值
4. 可行性分析

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
        temperature: 0.7,
        enableFallback: true
      });
    case "outline_generation":
      return orchestrateAIRequest({
        taskType: "strategy",
        prompt: `请为论文"${context.projectTitle}"生成博士开题级别的详细大纲。
研究方向：${context.userInputs?.selectedDirection || "未指定"}
方向描述：${context.userInputs?.directionDescription || "未指定"}

要求：
1. 生成符合博士开题要求的大纲
2. 结构完整，逻辑严谨
3. 包含研究背景、文献综述、研究方法、研究结果、讨论和结论等章节
4. 每个章节要有明确的目标和摘要`,
        systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文大纲专家。基于用户提供的主题和研究方向，生成博士开题级别的详细大纲。大纲应包括：
1. 绪论（研究背景、问题陈述、研究意义）
2. 文献综述（国内外研究现状、理论基础）
3. 研究方法（研究设计、数据收集与分析）
4. 研究结果（数据描述、结果分析）
5. 讨论（结果解释、理论贡献、实践意义）
6. 结论与展望（研究结论、局限、未来方向）

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
        temperature: 0.7,
        enableFallback: true
      });
    case "content_generation":
      return orchestrateAIRequest({
        taskType: "content",
        prompt: context.prompt || "",
        systemPrompt: context.systemPrompt,
        temperature: 0.5,
        enableFallback: true
      });
    case "review":
      return orchestrateAIRequest({
        taskType: "review",
        prompt: `请对以下内容进行评审：\n\n${context.content || ""}`,
        systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文评审专家。请对用户提供的稿件进行全面评估，并提供具体的改进建议。评估应包括：
1. 整体质量评分（1-10 分）
2. 主要优点
3. 主要问题
4. 具体改进建议
5. 结构优化建议

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
        temperature: 0.5,
        enableFallback: true
      });
    case "revision_suggestions": {
      const revisions = await AiOrchestrator.generateRevisionSuggestions(
        context.content || "",
        context.qualityReport || { score: 7, passed: true, iterations: 1 },
        buildRevisionContext(context)
      );

      return {
        content: `已生成 ${revisions.length} 条改稿建议，可继续逐条应用。`,
        revisions,
        fallback: false
      };
    }
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
}

// 为不同任务类型生成默认内容
function getDefaultContentForTask(taskType: string, context: StreamRequestContext) {
  switch (taskType) {
    case "topic_analysis":
      return `【研究方向建议】

1. **理论研究方向**
   深入研究相关理论基础，构建系统的理论框架。

2. **实证研究方向**
   通过数据收集和分析，验证研究假设。

3. **应用研究方向**
   关注研究成果的实际应用价值。

4. **跨学科研究方向**
   融合多学科知识和方法，从多角度探讨研究问题。

5. **方法创新方向**
   探索新的研究方法或改进现有方法。

【说明】AI 服务暂时不可用，以上为通用建议。`;
    case "outline_generation":
      return buildOutlineFallback({
        projectTitle: context.projectTitle,
        selectedDirectionLabel: context.userInputs?.selectedDirection,
        selectedDirectionDescription: context.userInputs?.directionDescription
      }).plainText;
    case "content_generation":
      return `【内容生成】

内容已根据您的要求生成。由于 AI 服务暂时不可用，以上为占位内容。建议您：
1. 提供具体的内容要求
2. 明确文章结构和重点
3. 补充相关背景信息

【说明】AI 服务暂时不可用，请稍后重试。`;
    case "review":
      return `【评审意见】

【整体评价】
内容整体结构完整，论述基本清晰，但仍有改进空间。

【主要优点】
1. 主题明确，研究方向清晰
2. 内容具有一定的学术价值
3. 结构基本完整

【主要问题】
1. 需要进一步加强理论深度
2. 建议补充更多实证支持
3. 部分论述需要更严谨的学术表达

【改进建议】
1. 强化理论基础，增加相关文献引用
2. 补充实证数据或案例支持
3. 优化语言表达，使其更符合学术规范

【说明】AI 服务暂时不可用，以上为通用评审意见。`;
    case "revision_suggestions":
      return "AI 服务暂时不可用，已生成默认改稿建议。";
    default:
      return "AI 服务暂时不可用，请稍后重试。";
  }
}

export async function POST(request: Request) {
  let body: StreamRequestBody;

  try {
    body = (await request.json()) as StreamRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法 JSON。" },
      { status: 400 }
    );
  }

  if (!body.taskType || !body.context) {
    return NextResponse.json(
      { ok: false, error: "缺少 taskType 或 context。" },
      { status: 400 }
    );
  }

  const stream = createSseStream(async (send) => {
    send({
      type: "thinking",
      data: {
        status: "progress",
        step: "正在分析任务类型与上下文",
        progress: 0.2
      }
    });

    send({
      type: "thinking",
      data: {
        status: "progress",
        step: "正在选择模型与回退策略",
        progress: 0.55
      }
    });

    let result: StreamTaskResult;
    try {
      result = await resolveTask(body.taskType!, body.context!);
    } catch (error) {
      console.error("AI processing failed in stream:", error);
      result = {
        content: getDefaultContentForTask(body.taskType!, body.context!),
        revisions: body.taskType === "revision_suggestions"
          ? await AiOrchestrator.generateRevisionSuggestions("", {}, buildRevisionContext(body.context!))
          : [],
        fallback: true
      };
    }

    send({
      type: "thinking",
      data: {
        status: "completed",
        progress: 1
      }
    });

    const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    const chunks = chunkText(content);

    chunks.forEach((chunk, index) => {
      send({
        type: "content",
        data: {
          status: "progress",
          chunk,
          progress: (index + 1) / chunks.length
        }
      });
    });

    send({
      type: "content",
      data: {
        status: "completed",
        content
      }
    });

    if (hasRevisions(result)) {
      send({
        type: "revision",
        data: {
          status: "completed",
          revisions: result.revisions
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
