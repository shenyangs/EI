import { NextResponse } from "next/server";
import { AiOrchestrator, AiTaskType, AiTaskContext } from "@/lib/ai/ai-orchestrator";
import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";

type ThinkRequest = {
  taskType: AiTaskType;
  content?: string;
  context: AiTaskContext;
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
        // 主题分析 - 使用项目标题作为内容
        result = await orchestrateAIRequest({
          taskType: 'direction',
          prompt: `请为主题"${body.context.projectTitle}"生成5个具体的研究方向，每个方向包括名称、描述、研究价值和可行性分析。`,
          systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术方向顾问。基于用户提供的主题，生成3-5个具体的研究方向，每个方向包括：
1. 方向名称
2. 简要描述（1-2句话）
3. 研究价值
4. 可行性分析

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
          temperature: 0.7,
          enableFallback: true
        });
        return NextResponse.json({
          ok: true,
          content: {
            content: result.content,
            metadata: {
              directions: parseDirections(result.content)
            }
          }
        });
        
      case 'outline_generation':
        // 大纲生成
        result = await orchestrateAIRequest({
          taskType: 'strategy',
          prompt: `请为项目"${body.context.projectTitle}"生成详细的论文大纲。`,
          systemPrompt: `你是一个学术论文大纲生成专家。请生成结构清晰、逻辑严谨的论文大纲。`,
          temperature: 0.7,
          enableFallback: true
        });
        return NextResponse.json({
          ok: true,
          content: {
            content: result.content,
            metadata: {
              topics: extractTopics(result.content)
            }
          }
        });
        
      case 'project_initialization':
        // 项目初始化分析
        result = await orchestrateAIRequest({
          taskType: 'strategy',
          prompt: `请分析项目"${body.context.projectTitle}"的可行性和研究方向。`,
          systemPrompt: `你是一个项目分析专家。请分析项目的可行性、创新性和研究价值。`,
          temperature: 0.7,
          enableFallback: true
        });
        return NextResponse.json({
          ok: true,
          content: {
            content: result.content,
            metadata: {
              analysis: result.content
            }
          }
        });
        
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
        result = await AiOrchestrator.runTask(body.taskType, body.content, body.context);
        return NextResponse.json(result);
        
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
        result = await AiOrchestrator.runTask(body.taskType, body.content, body.context);
        return NextResponse.json(result);
    }
  } catch (error) {
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

// 解析研究方向
function parseDirections(content: string): any[] {
  const directions = [];
  const lines = content.split('\n');
  let currentDirection: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 匹配方向标题（如 "1. 方向名称" 或 "方向一：名称"）
    if (/^\d+[.．、]/.test(trimmed) || /^方向[一二三四五]/.test(trimmed)) {
      if (currentDirection) {
        directions.push(currentDirection);
      }
      currentDirection = {
        id: `direction-${directions.length + 1}`,
        label: trimmed.replace(/^\d+[.．、]\s*/, '').replace(/^方向[一二三四五][：:]\s*/, ''),
        description: '',
        confidence: 90
      };
    } else if (currentDirection) {
      currentDirection.description += trimmed + ' ';
    }
  }
  
  if (currentDirection) {
    directions.push(currentDirection);
  }
  
  // 如果没有解析出方向，返回默认方向
  if (directions.length === 0) {
    return [
      {
        id: 'direction-1',
        label: '理论研究',
        description: '基于理论分析的研究方向',
        confidence: 85
      },
      {
        id: 'direction-2',
        label: '实证研究',
        description: '基于数据实证的研究方向',
        confidence: 80
      }
    ];
  }
  
  return directions;
}

// 提取主题关键词
function extractTopics(content: string): string[] {
  const topics = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 提取可能的主题（带序号的行）
    if (/^\d+[.．、]/.test(trimmed)) {
      const topic = trimmed.replace(/^\d+[.．、]\s*/, '').split(/[：:]/)[0];
      if (topic && topic.length > 2 && topic.length < 50) {
        topics.push(topic);
      }
    }
  }
  
  // 如果没有提取到主题，返回默认主题
  if (topics.length === 0) {
    return ['研究背景', '研究方法', '研究结果', '讨论与分析', '结论与展望'];
  }
  
  return topics.slice(0, 5);
}
