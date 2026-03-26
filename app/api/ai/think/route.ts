import { NextResponse } from "next/server";
import { AiOrchestrator, AiTaskType, AiTaskContext } from "@/lib/ai/ai-orchestrator";
import { orchestrateAIRequest } from "@/lib/ai/ai-orchestrator";

type ThinkRequest = {
  taskType: AiTaskType | 'fill_field';
  content?: string;
  context: AiTaskContext & {
    field?: string;
    currentValue?: string;
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
      case 'fill_field':
        // 字段填充 - 为特定字段生成内容
        result = await fillField(body);
        return NextResponse.json(result);
        
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

// 填充字段 - 为特定字段生成内容
async function fillField(body: ThinkRequest) {
  const { field, currentValue, userInputs } = body.context;
  const { title, subject, keywords, description } = userInputs || {};
  
  if (!field) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少字段名称。"
      },
      { status: 400 }
    );
  }

  let prompt = '';
  let systemPrompt = '';
  
  switch (field) {
    case 'title':
      systemPrompt = `你是一个专业的学术论文标题生成专家，擅长为服装、设计、时尚、人文社科与技术交叉领域的研究生成专业、准确的标题。

你的任务是：
1. 基于用户提供的信息生成一个具体、专业的研究标题
2. 标题要简洁明了，体现研究核心内容
3. 符合学术规范
4. 不要添加任何解释或说明

输出格式：直接输出标题文本，不要有任何前缀或后缀。`;
      
      prompt = `请为以下研究生成一个专业的学术标题：

`;
      if (title && title.trim()) prompt += `【当前标题】${title}\n`;
      if (subject && subject.trim()) prompt += `【研究对象】${subject}\n`;
      if (keywords && keywords.trim()) prompt += `【关键词】${keywords}\n`;
      if (description && description.trim()) prompt += `【研究描述】${description}\n`;
      break;
      
    case 'subject':
      systemPrompt = `你是一个专业的学术研究专家，擅长识别和确定研究对象。

你的任务是：
1. 基于用户提供的信息，确定具体的研究对象
2. 研究对象要具体、明确
3. 符合学术规范
4. 不要添加任何解释或说明

输出格式：直接输出研究对象文本，不要有任何前缀或后缀。`;
      
      prompt = `请确定以下研究的具体研究对象：

`;
      if (title && title.trim()) prompt += `【研究标题】${title}\n`;
      if (subject && subject.trim()) prompt += `【当前研究对象】${subject}\n`;
      if (keywords && keywords.trim()) prompt += `【关键词】${keywords}\n`;
      if (description && description.trim()) prompt += `【研究描述】${description}\n`;
      break;
      
    case 'keywords':
      systemPrompt = `你是一个专业的学术关键词提取专家，擅长为研究生成准确的关键词。

你的任务是：
1. 基于用户提供的信息，提取3-5个核心关键词
2. 关键词要能准确反映研究内容
3. 符合学术规范
4. 用逗号分隔
5. 不要添加任何解释或说明

输出格式：直接输出关键词列表，用逗号分隔，不要有任何前缀或后缀。`;
      
      prompt = `请为以下研究提取3-5个核心关键词：

`;
      if (title && title.trim()) prompt += `【研究标题】${title}\n`;
      if (subject && subject.trim()) prompt += `【研究对象】${subject}\n`;
      if (keywords && keywords.trim()) prompt += `【当前关键词】${keywords}\n`;
      if (description && description.trim()) prompt += `【研究描述】${description}\n`;
      break;
      
    case 'description':
      systemPrompt = `你是一个专业的学术研究描述专家，擅长将初步想法转化为专业的研究描述。

你的任务是：
1. 基于用户提供的信息，生成详细、专业的研究描述
2. 描述要包含研究背景、研究问题、研究目标等要素
3. 符合学术规范
4. 语言清晰、逻辑严谨

输出格式：直接输出研究描述文本，不要有任何前缀或后缀。`;
      
      prompt = `请为以下研究生成详细的研究描述：

`;
      if (title && title.trim()) prompt += `【研究标题】${title}\n`;
      if (subject && subject.trim()) prompt += `【研究对象】${subject}\n`;
      if (keywords && keywords.trim()) prompt += `【关键词】${keywords}\n`;
      if (description && description.trim()) prompt += `【当前描述】${description}\n`;
      break;
      
    default:
      return NextResponse.json(
        {
          ok: false,
          error: `不支持的字段类型：${field}`
        },
        { status: 400 }
      );
  }

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt,
      temperature: 0.7
    });

    return {
      ok: true,
      content: {
        content: aiResult.content,
        sections: {
          [field]: aiResult.content
        },
        metadata: {
          generatedField: field
        }
      }
    };
  } catch (error) {
    console.error(`AI field filling failed for ${field}:`, error);
    throw error;
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
    throw error;
  }
}

// 生成大纲 - 基于选择的方向
async function generateOutline(body: ThinkRequest) {
  const { projectTitle, userInputs } = body.context;
  const { subject, keywords, description, selectedDirection } = userInputs || {};
  
  let prompt = `请为以下研究项目生成详细的博士开题级别论文大纲：

【主题】${projectTitle}`;
  
  if (selectedDirection?.label) {
    prompt += `\n【研究方向】${selectedDirection.label}`;
  }
  
  if (selectedDirection?.description) {
    prompt += `\n【方向描述】${selectedDirection.description}`;
  }
  
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
1. 大纲必须紧密结合用户选择的研究方向和主题
2. 体现博士开题级别的深度和广度
3. 包含完整的章节结构（绪论、文献综述、研究方法、实验/案例分析、结果讨论、结论等）
4. 每个章节要有具体的小节和要点
5. 体现学科交叉特色
6. 输出格式清晰的层级结构`;

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt: `你是一个专业的学术论文大纲设计专家，擅长为博士开题级别的论文设计详细、系统的章节结构。

你的任务是：
1. 深入理解用户的研究主题、选择的方向和学科背景
2. 设计符合博士开题级别的详细大纲
3. 大纲必须紧密结合用户的具体输入，不能是模板化的内容
4. 包含完整的章节结构，每个章节有具体的小节和要点
5. 体现学科交叉特色（服装、设计、时尚、人文社科与技术）
6. 确保大纲的逻辑性和可操作性

输出必须结构清晰、层次分明，不要输出思考过程。`,
      temperature: 0.7,

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
    throw error;
  }
}

// 生成项目分析 - 全面分析用户输入
async function generateProjectAnalysis(body: ThinkRequest) {
  const { projectTitle, userInputs } = body.context;
  const { subject, keywords, description, venueId } = userInputs || {};
  
  let prompt = `请对以下研究项目进行全面分析：

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
  
  if (venueId) {
    prompt += `\n【目标会议/期刊】${venueId}`;
  }
  
  prompt += `\n\n请提供以下分析：
1. 项目可行性评估（技术可行性、资源可行性、时间可行性）
2. 创新性分析（理论创新、方法创新、应用创新）
3. 研究价值评估（学术价值、实践价值、社会价值）
4. 潜在挑战与风险
5. 建议的研究路径
6. 5个具体的研究方向建议`;

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt: `你是一个专业的科研项目评估专家，擅长对研究项目进行全面、深入的可行性、创新性和价值评估。

你的任务是：
1. 深入分析用户提供的项目信息（主题、学科、关键词、描述）
2. 评估项目的可行性（技术、资源、时间）
3. 分析项目的创新性（理论、方法、应用）
4. 评估项目的研究价值（学术、实践、社会）
5. 识别潜在挑战与风险
6. 提供建议的研究路径
7. 生成5个具体的研究方向

输出必须全面、专业、有针对性，不要输出思考过程。`,
      temperature: 0.7,

    });

    return {
      ok: true,
      content: {
        content: aiResult.content,
        metadata: {
          analysis: aiResult.content,
          directions: parseDirections(aiResult.content)
        }
      }
    };
  } catch (error) {
    console.error('AI project analysis failed:', error);
    throw error;
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
    
    // 匹配方向标题（如 "1. 方向名称" 或 "方向一：名称" 或 "## 方向名称"）
    if (/^\d+[.．、]/.test(trimmed) || /^方向[一二三四五]/.test(trimmed) || /^##?\s*/.test(trimmed)) {
      if (currentDirection) {
        directions.push(currentDirection);
      }
      const label = trimmed
        .replace(/^\d+[.．、]\s*/, '')
        .replace(/^方向[一二三四五][：:]\s*/, '')
        .replace(/^##?\s*/, '')
        .replace(/\*\*/g, '');
      currentDirection = {
        id: `direction-${directions.length + 1}`,
        label: label,
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
  
  // 如果没有解析出方向，返回空数组（让前端处理）
  return directions;
}

// 提取主题关键词
function extractTopics(content: string): string[] {
  const topics = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 提取可能的主题（带序号的行或章节标题）
    if (/^\d+[.．、]/.test(trimmed) || /^第[一二三四五]章/.test(trimmed) || /^##?\s+/.test(trimmed)) {
      const topic = trimmed
        .replace(/^\d+[.．、]\s*/, '')
        .replace(/^第[一二三四五]章\s*/, '')
        .replace(/^##?\s+/, '')
        .replace(/\*\*/g, '')
        .split(/[：:]/)[0];
      if (topic && topic.length > 2 && topic.length < 50) {
        topics.push(topic);
      }
    }
  }
  
  return topics.slice(0, 10);
}
