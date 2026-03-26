import { NextResponse } from "next/server";
import { AiTaskType, AiTaskContext, orchestrateAIRequest, AiOrchestrator } from "@/lib/ai/ai-orchestrator";

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

// 填充字段 - 为特定字段生成内容
async function fillField(body: ThinkRequest) {
  const { field, currentValue, userInputs } = body.context;
  const { title, subject, keywords, description } = userInputs || {};
  
  if (!field) {
    return {
      ok: false,
      error: "缺少字段名称。"
    };
  }

  let prompt = '';
  let systemPrompt = '';
  
  switch (field) {
    case 'title':
      systemPrompt = `你是一个专业的学术论文标题生成专家，擅长为各种领域的研究生成专业、准确的标题。

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
1. 基于用户提供的研究标题，确定具体的研究对象
2. 研究对象要与研究标题紧密相关，不要偏离主题
3. 研究对象要具体、明确
4. 符合学术规范
5. 不要添加任何解释或说明

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
1. 基于用户提供的研究标题，提取3-5个核心关键词
2. 关键词要能准确反映研究内容，与研究标题紧密相关
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
1. 基于用户提供的研究标题，生成详细、专业的研究描述
2. 描述要包含研究背景、研究问题、研究目标等要素
3. 内容要与研究标题紧密相关，不要偏离主题
4. 符合学术规范
5. 语言清晰、逻辑严谨

输出格式：直接输出研究描述文本，不要有任何前缀或后缀。`;
      
      prompt = `请为以下研究生成详细的研究描述：

`;
      if (title && title.trim()) prompt += `【研究标题】${title}\n`;
      if (subject && subject.trim()) prompt += `【研究对象】${subject}\n`;
      if (keywords && keywords.trim()) prompt += `【关键词】${keywords}\n`;
      if (description && description.trim()) prompt += `【当前描述】${description}\n`;
      break;
      
    default:
      return {
        ok: false,
        error: `不支持的字段类型：${field}`
      };
  }

  try {
    console.log(`Generating ${field} for title: ${title}`);
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt,
      temperature: 0.7,
      enableFallback: true
    });

    // 检查是否使用了默认回退内容（如果是，使用我们自己的智能默认内容）
    if (aiResult.fallback && aiResult.model?.provider === 'default') {
      const defaultContent = getDefaultFieldContent(field, title || "研究主题");
      console.log(`Using smart default content for ${field}:`, defaultContent);
      return {
        ok: true,
        content: {
          content: defaultContent,
          sections: {
            [field]: defaultContent
          },
          metadata: {
            generatedField: field,
            isFallback: true
          }
        }
      };
    }

    console.log(`AI result for ${field}:`, aiResult.content);
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
    // 返回默认内容作为回退
    const defaultContent = getDefaultFieldContent(field, title || "研究主题");
    console.log(`Using default content for ${field}:`, defaultContent);
    return {
      ok: true,
      content: {
        content: defaultContent,
        sections: {
          [field]: defaultContent
        },
        metadata: {
          generatedField: field,
          isFallback: true
        }
      }
    };
  }
}

// 获取默认字段内容
function getDefaultFieldContent(field: string, title: string): string {
  // 提取标题中的核心词汇
  const extractCoreWords = (text: string) => {
    // 移除常见的前缀和后缀
    let processed = text.replace(/基于|研究|理论|实践|探索|科学|技术/g, '');
    // 按空格和标点分割
    const words = processed.split(/[\s,，：:]+/).filter(word => word.length > 2);
    return words;
  };

  const coreWords = extractCoreWords(title);
  
  switch (field) {
    case 'title':
      return `基于${title}的跨学科研究：理论与实践探索`;
    case 'subject':
      if (coreWords.length > 0) {
        return `${coreWords.join('、')}相关领域`;
      }
      return `${title}相关领域`;
    case 'keywords':
      // 从标题中提取关键词
      const titleWords = title.split(/[\s,，]+/).filter(word => word.length > 2);
      const defaultKeywords = ['跨学科研究', '理论与实践', '创新应用'];
      const keywords = [...titleWords.slice(0, 2), ...defaultKeywords].slice(0, 5);
      return keywords.join(', ');
    case 'description':
      return `本研究旨在深入探讨${title}相关的学术问题，通过理论分析与实践探索相结合的方法，为该领域的发展提供新的视角和解决方案。研究将重点关注理论基础、实践应用、创新路径等方面，通过系统的文献综述、实证研究和案例分析，构建完整的研究框架，为相关领域的学术研究和实践应用提供参考。`;
    default:
      return `该字段内容需要根据具体研究内容生成。`;
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
    // 返回默认大纲
    return {
      ok: true,
      content: {
        content: generateDefaultOutline(projectTitle),
        metadata: {
          topics: ['研究背景', '研究方法', '研究结果', '讨论与分析', '结论与展望']
        }
      }
    };
  }
}

// 生成项目分析
async function generateProjectAnalysis(body: ThinkRequest) {
  const { projectTitle, userInputs } = body.context;
  const { subject, keywords, description } = userInputs || {};
  
  let prompt = `请对以下研究项目进行全面的可行性分析：

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
1. 分析项目的可行性（理论、方法、实践）
2. 评估项目的创新性和研究价值
3. 提出3-5个具体的研究方向建议
4. 每个方向要包含：名称、核心问题、研究价值、可行性、创新点`;

  try {
    const aiResult = await orchestrateAIRequest({
      taskType: 'strategy',
      prompt,
      systemPrompt: `你是一个专业的项目可行性分析专家，擅长评估学术研究项目的可行性、创新性和价值。

你的任务是：
1. 全面分析项目的可行性（理论、方法、实践三个维度）
2. 评估项目的创新性和研究价值
3. 提出3-5个具体、可操作的研究方向
4. 每个方向要有详细的说明

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
      temperature: 0.7,
      enableFallback: true
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
    // 返回默认分析
    return {
      ok: true,
      content: {
        content: generateDefaultAnalysis(projectTitle),
        metadata: {
          analysis: generateDefaultAnalysis(projectTitle),
          directions: getDefaultDirections(projectTitle)
        }
      }
    };
  }
}

// 从标题中提取核心词汇
function extractCoreWordsFromTitle(title: string): string[] {
  // 移除常见的前缀和后缀
  let processed = title.replace(/基于|研究|理论|实践|探索|科学|技术|的|与|和/g, '');
  // 按空格和标点分割
  const words = processed.split(/[\s,，：:]+/).filter(word => word.length > 2);
  return words;
}

// 生成默认研究方向文本
function generateDefaultDirections(title: string): string {
  // 从标题中提取核心词汇
  const coreWords = extractCoreWordsFromTitle(title);
  const coreText = coreWords.length > 0 ? coreWords.join('与') : '研究主题';
  
  return `基于"${title}"的研究方向分析：

1. ${coreText} 理论研究
深入探讨${coreText}相关的理论基础，构建系统的理论框架，为后续研究奠定坚实基础。

2. ${coreText} 实证研究
通过数据收集和分析，验证${coreText}相关的研究假设，确保研究结论的科学性和可靠性。

3. ${coreText} 设计实践
结合${coreText}的设计实践，探索创新解决方案，推动理论成果转化应用。

4. ${coreText} 跨学科研究
融合多学科知识和方法，从多角度探讨${coreText}相关问题，拓展研究视野。

5. ${coreText} 应用研究
关注${coreText}的实际应用价值，探索在具体场景中的应用可能性，提升研究的实用价值。`;
}

// 获取默认研究方向数组
function getDefaultDirections(title: string): any[] {
  const coreWords = extractCoreWordsFromTitle(title);
  const coreText = coreWords.length > 0 ? coreWords.join('与') : title;
  
  return [
    {
      id: 'direction-1',
      label: `${coreText} 理论研究`,
      description: `深入探讨"${coreText}"的理论基础，构建系统的理论框架，为后续研究奠定坚实基础。`,
      confidence: 90,
      whyItFits: ['理论基础扎实', '学术价值高', '研究路径清晰'],
      writingStrategy: ['系统梳理文献', '构建理论模型', '深入分析论证'],
      readyOutputs: ['文献综述', '理论框架', '研究假设']
    },
    {
      id: 'direction-2',
      label: `${coreText} 实证研究`,
      description: `通过数据收集和分析，验证"${coreText}"相关假设，提供实证支持。`,
      confidence: 85,
      whyItFits: ['数据支撑有力', '结论可信度高', '实践指导性强'],
      writingStrategy: ['设计研究方案', '收集实证数据', '统计分析验证'],
      readyOutputs: ['实验设计', '数据分析', '结果讨论']
    },
    {
      id: 'direction-3',
      label: `${coreText} 设计实践`,
      description: `结合设计实践，探索"${coreText}"的创新解决方案。`,
      confidence: 88,
      whyItFits: ['实践性强', '创新性高', '应用价值大'],
      writingStrategy: ['案例研究', '设计实践', '效果评估'],
      readyOutputs: ['设计方案', '实践案例', '评估报告']
    },
    {
      id: 'direction-4',
      label: `${coreText} 跨学科研究`,
      description: `融合多学科知识，从多角度探讨"${coreText}"。`,
      confidence: 82,
      whyItFits: ['视角多元', '创新性强', '学术前沿'],
      writingStrategy: ['跨学科文献综述', '多维度分析', '综合讨论'],
      readyOutputs: ['跨学科框架', '综合分析', '创新观点']
    },
    {
      id: 'direction-5',
      label: `${coreText} 应用研究`,
      description: `关注"${coreText}"的实际应用价值，推动成果转化。`,
      confidence: 80,
      whyItFits: ['实用性强', '社会价值高', '推广前景好'],
      writingStrategy: ['应用场景分析', '解决方案设计', '效果验证'],
      readyOutputs: ['应用方案', '实施指南', '效果评估']
    }
  ];
}

// 生成默认大纲
function generateDefaultOutline(title: string): string {
  return `《${title}》论文大纲

1. 绪论
   1.1 研究背景与意义
   1.2 国内外研究现状
   1.3 研究目标与内容
   1.4 研究方法与技术路线

2. 理论基础与文献综述
   2.1 核心概念界定
   2.2 相关理论基础
   2.3 国内外研究综述
   2.4 研究缺口分析

3. 研究设计
   3.1 研究框架
   3.2 研究方法
   3.3 数据来源
   3.4 分析工具

4. 研究结果与分析
   4.1 数据描述
   4.2 结果分析
   4.3 发现与讨论

5. 结论与展望
   5.1 研究结论
   5.2 理论贡献
   5.3 实践意义
   5.4 研究局限与展望`;
}

// 生成默认项目分析
function generateDefaultAnalysis(title: string): string {
  const coreWords = extractCoreWordsFromTitle(title);
  const coreText = coreWords.length > 0 ? coreWords.join('与') : '研究主题';
  
  return `《${title}》项目可行性分析报告

一、项目概述
本项目旨在深入研究"${title}"，聚焦${coreText}相关核心问题，通过系统的理论分析和实证研究，探索该领域的创新解决方案。

二、可行性分析
1. 理论可行性
   - ${coreText}相关理论基础较为成熟
   - 研究框架清晰明确
   - 学术资源丰富

2. 方法可行性
   - 研究方法科学规范
   - ${coreText}相关数据获取渠道畅通
   - 分析工具成熟可靠

3. 实践可行性
   - ${coreText}应用场景明确
   - 实施条件具备
   - 预期成果可期

三、创新性分析
1. 理论创新：构建${coreText}相关的新的理论框架或拓展现有理论
2. 方法创新：采用新的研究方法或改进现有方法
3. 实践创新：提出${coreText}相关的新解决方案或应用场景

四、研究价值
1. 学术价值：丰富${coreText}相关领域的理论研究
2. 实践价值：为${coreText}的实际应用提供指导和参考
3. 社会价值：推动${coreText}相关领域的发展和进步

五、建议研究方向
1. ${coreText}理论研究：深入探讨理论基础
2. ${coreText}实证研究：通过数据验证假设
3. ${coreText}应用研究：关注实际应用价值`;
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
