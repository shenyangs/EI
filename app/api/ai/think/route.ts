import { NextResponse } from "next/server";
import { AiOrchestrator, AiTaskType, AiTaskContext } from "@/lib/ai/ai-orchestrator";
import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";

type ThinkRequest = {
  taskType: AiTaskType;
  content?: string;
  context: AiTaskContext & {
    userInputs?: {
      title?: string;
      subject?: string;
      keywords?: string;
      description?: string;
      venueId?: string;
      selectedDirection?: {
        label?: string;
        description?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  let body: ThinkRequest;

  try {
    body = (await request.json()) as ThinkRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.taskType || !body.context) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少必要的任务类型和上下文信息。"
      },
      { status: 400 }
    );
  }

  try {
    let result;
    
    // 根据任务类型选择处理方式
    switch (body.taskType) {
      case 'topic_analysis':
        // 主题分析 - 基于用户输入的详细信息生成研究方向
        result = await generateTopicAnalysis(body);
        return NextResponse.json(result);
        
      case 'outline_generation':
        // 大纲生成 - 基于选择的方向生成详细大纲
        result = await generateOutline(body);
        return NextResponse.json(result);
        
      case 'project_initialization':
        // 项目初始化分析 - 全面分析用户输入
        result = await generateProjectAnalysis(body);
        return NextResponse.json(result);
        
      case 'content_generation':
      case 'quality_review':
      case 'revision_suggestions':
        // 这些任务需要 content 字段
        if (!body.content) {
          return NextResponse.json(
            {
              ok: false,
              error: "该任务类型需要提供内容。"
            },
            { status: 400 }
          );
        }
        try {
          result = await AiOrchestrator.runTask(body.taskType, body.content, body.context);
          return NextResponse.json(result);
        } catch (error) {
          console.warn('AI runTask failed, using fallback:', error);
          return NextResponse.json({
            ok: true,
            content: {
              content: "AI 服务暂时不可用，请稍后重试。",
              metadata: {}
            }
          });
        }
        
      default:
        // 使用旧的 runTask 方法处理其他任务
        if (!body.content) {
          return NextResponse.json(
            {
              ok: false,
              error: "该任务类型需要提供内容。"
            },
            { status: 400 }
          );
        }
        try {
          result = await AiOrchestrator.runTask(body.taskType, body.content, body.context);
          return NextResponse.json(result);
        } catch (error) {
          console.warn('AI runTask failed, using fallback:', error);
          return NextResponse.json({
            ok: true,
            content: {
              content: "AI 服务暂时不可用，请稍后重试。",
              metadata: {}
            }
          });
        }
    }
  } catch (error) {
    console.error('Unexpected error in think route:', error);
    const message = error instanceof Error ? error.message : "AI 思考过程失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}

// 生成主题分析 - 基于用户输入的详细信息
async function generateTopicAnalysis(body: ThinkRequest) {
  const { projectTitle, userInputs } = body.context;
  const { subject, keywords, description } = userInputs || {};
  
  // 构建详细的prompt
  let prompt = `请为以下研究主题生成5个具体、个性化的研究方向：

【主题】${projectTitle}`;
  
  if (subject) {
    prompt += `\n【学科领域】${subject}`;
  }
  
  if (keywords) {
    prompt += `\n【关键词】${keywords}`;
  }
  
  if (description) {
    prompt += `\n【研究描述】${description}`;
  }
  
  prompt += `\n\n要求：
1. 生成的研究方向必须紧密结合用户提供的主题、学科、关键词和描述
2. 每个方向要具体、可操作，不能是泛泛而谈
3. 体现学科交叉特色（服装、设计、时尚、人文社科与技术）
4. 输出格式：
   - 方向名称
   - 核心问题（1-2句话）
   - 研究价值
   - 可行性分析
   - 创新点
   - 预期成果`;

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'direction',
      prompt,
      systemPrompt: `你是一个专业的学术研究顾问，擅长为服装、设计、时尚、人文社科与技术交叉领域提供个性化的研究方向建议。

你的任务是：
1. 深入理解用户提供的主题、学科、关键词和描述
2. 生成5个具体、个性化、可操作的研究方向
3. 每个方向必须紧密结合用户的输入，不能是模板化的内容
4. 体现学科交叉特色
5. 提供详细的研究价值、可行性分析、创新点和预期成果

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
      temperature: 0.8,
      enableFallback: true
    });

    return {
      ok: true,
      content: {
        content: aiResult.content,
        metadata: {
          directions: parseDirections(aiResult.content)
        }
      }
    };
  } catch (error) {
    console.error('AI topic analysis failed:', error);
    // 返回默认方向
    return {
      ok: true,
      content: {
        content: generateDefaultDirections(projectTitle),
        metadata: {
          directions: getDefaultDirections(projectTitle)
        }
      }
    };
  }
}

// 生成大纲
async function generateOutline(body: ThinkRequest) {
  const { projectTitle, userInputs } = body.context;
  const { selectedDirection } = userInputs || {};
  
  let prompt = `请为以下研究项目生成详细的博士开题级别大纲：

【主题】${projectTitle}`;
  
  if (selectedDirection?.label) {
    prompt += `\n【选定方向】${selectedDirection.label}`;
  }
  
  if (selectedDirection?.description) {
    prompt += `\n【方向描述】${selectedDirection.description}`;
  }
  
  prompt += `\n\n要求：
1. 大纲必须紧密结合选定的研究方向
2. 结构完整，包含：绪论、文献综述、研究方法、研究结果、讨论、结论
3. 每个章节要有明确的目标和摘要
4. 符合博士开题级别的学术规范
5. 体现学科交叉特色`;

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt: `你是一个专业的学术论文大纲生成专家，擅长为博士开题级别的论文生成详细、规范的大纲。

你的任务是：
1. 基于用户提供的主题和选定方向，生成完整的论文大纲
2. 每个章节必须包含：章节标题、目标、摘要
3. 结构严谨，逻辑清晰
4. 符合学术规范
5. 体现学科交叉特色

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
      temperature: 0.7,
      enableFallback: true
    });

    return {
      ok: true,
      content: {
        content: aiResult.content,
        metadata: {
          topics: extractTopics(aiResult.content)
        }
      }
    };
  } catch (error) {
    console.error('AI outline generation failed:', error);
    // 返回