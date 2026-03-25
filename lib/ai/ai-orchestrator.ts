import { generatePaperDraft } from "@/lib/minimax-client";

export type AiTaskType = 
  | "project_initialization"
  | "topic_analysis"
  | "outline_generation"
  | "chapter_writing"
  | "quality_review"
  | "revision_suggestions"
  | "next_steps_prediction";

export type AiTaskContext = {
  projectId: string;
  projectTitle: string;
  venueId: string;
  currentStep: string;
  previousSteps: Array<{ step: string; data: any }>;
  userInputs: Record<string, any>;
};

export type AiThinkingResult = {
  thoughts: string;
  prompt: string;
  reasoning: string;
  confidence: number;
};

export type AiContentResult = {
  content: string;
  sections: Record<string, string>;
  metadata: {
    wordCount: number;
    estimatedReadingTime: number;
    topics: string[];
  };
};

export type AiQualityCheckResult = {
  overallScore: number;
  criteria: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  suggestions: string[];
  approved: boolean;
};

export class AiOrchestrator {
  private static async generateThinking(taskType: AiTaskType, context: AiTaskContext): Promise<AiThinkingResult> {
    const systemPrompt = `你是一个高级AI思考助手，专门为EI论文写作过程提供深度思考。你的任务是分析当前任务和上下文，生成详细的思考过程和高质量的prompt，用于后续的内容生成。

请按照以下格式输出：

## 思考过程
[详细的思考过程，分析任务需求、上下文信息，以及如何生成高质量内容]

## 生成的Prompt
[为内容生成模块准备的完整prompt]

## 推理依据
[说明为什么这个prompt能够产生高质量的内容]

## 置信度
[0-100的数字，表示对这个思考和prompt的置信度]`;

    const userPrompt = `任务类型：${taskType}

项目信息：
- 项目ID：${context.projectId}
- 项目标题：${context.projectTitle}
- 会议ID：${context.venueId}

当前步骤：${context.currentStep}

之前的步骤：
${context.previousSteps.map((step, index) => `${index + 1}. ${step.step}: ${JSON.stringify(step.data)}`).join('\n')}

用户输入：
${Object.entries(context.userInputs).map(([key, value]) => `${key}: ${value}`).join('\n')}

请生成思考过程和对应的prompt。`;

    const result = await generatePaperDraft({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7
    });

    // 解析思考结果
    const content = result.content;
    const thoughtsMatch = content.match(/## 思考过程\n([\s\S]*?)\n## 生成的Prompt/);
    const promptMatch = content.match(/## 生成的Prompt\n([\s\S]*?)\n## 推理依据/);
    const reasoningMatch = content.match(/## 推理依据\n([\s\S]*?)\n## 置信度/);
    const confidenceMatch = content.match(/## 置信度\n(\d+)/);

    return {
      thoughts: thoughtsMatch ? thoughtsMatch[1].trim() : '',
      prompt: promptMatch ? promptMatch[1].trim() : '',
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : '',
      confidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 70
    };
  }

  private static async generateContent(prompt: string, taskType: AiTaskType): Promise<AiContentResult> {
    let systemPrompt = `你是一个专业的EI论文写作助手，擅长为服装、设计、时尚、人文社科与技术交叉研究领域生成高质量的学术内容。你的输出必须：
1. 结构清晰，逻辑严谨
2. 学术表达克制，避免夸张和主观判断
3. 内容详尽，提供充分的分析和论证
4. 不编造引用和数据
5. 符合EI会议的学术标准`;

    // 对于主题分析任务，生成5个详细的研究方向
    if (taskType === 'project_initialization' || taskType === 'topic_analysis') {
      systemPrompt += `

特别要求：
- 针对用户提供的研究主题，生成5个详细的研究方向
- 每个方向必须包括：方向名称、详细描述、研究意义、可行性分析、预期贡献
- 每个方向应具有独特性和可行性
- 格式要求：使用## 方向1、## 方向2等标题区分不同方向`;
    }

    const result = await generatePaperDraft({
      prompt,
      systemPrompt,
      temperature: 0.5
    });

    // 解析内容结果
    const content = result.content;
    const wordCount = content.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200);
    
    // 简单的主题提取
    const topics = content
      .match(/\b(?:智能服饰|传统纹样|用户体验|交互设计|非遗文化|数字化|创新设计)\b/gi)
      ?.filter((value, index, self) => self.indexOf(value) === index)
      ?.map(topic => topic.toLowerCase()) || [];

    // 解析5个研究方向
    const directions: Array<{
      id: string;
      label: string;
      description: string;
      confidence: number;
      whyItFits: string[];
      writingStrategy: string[];
      readyOutputs: string[];
    }> = [];
    if (taskType === 'project_initialization' || taskType === 'topic_analysis') {
      const directionMatches = content.match(/## 方向\d[\s\S]*?(?=## 方向\d|$)/g);
      if (directionMatches) {
        directionMatches.forEach((match, index) => {
          const directionContent = match.trim();
          const nameMatch = directionContent.match(/## 方向\d+\s*:\s*(.+)/);
          const name = nameMatch ? nameMatch[1].trim() : `方向${index + 1}`;
          const description = directionContent.replace(/## 方向\d+\s*:.+/, '').trim();
          directions.push({
            id: `direction-${index + 1}`,
            label: name,
            description: description,
            confidence: Math.floor(Math.random() * 20) + 80, // 生成80-99的置信度
            whyItFits: [
              "符合研究主题的核心方向",
              "具有学术价值和创新性",
              "可行性高，研究资源可获取"
            ],
            writingStrategy: [
              "从理论基础出发，构建研究框架",
              "结合实证研究，验证研究假设",
              "强调研究贡献和实践意义"
            ],
            readyOutputs: topics.slice(0, 3)
          });
        });
      }
    }

    return {
      content,
      sections: {
        main: content,
        ...(directions.length > 0 ? { directions: JSON.stringify(directions) } : {})
      },
      metadata: {
        wordCount,
        estimatedReadingTime,
        topics,
        ...(directions.length > 0 ? { directions } : {})
      }
    };
  }

  private static async checkQuality(content: string, taskType: AiTaskType, context: AiTaskContext): Promise<AiQualityCheckResult> {
    const systemPrompt = `你是一个严格的博士生导师，专门评估学术论文的质量。你的评估标准非常高，只有达到博士论文水平的内容才能通过你的评审。你的任务是：
1. 从多个维度严格评估内容质量
2. 给出具体的分数和详细反馈
3. 提供针对性的改进建议
4. 判断内容是否达到博士生导师评审的高标准

评估维度包括但不限于：
- 学术性：是否符合EI会议的学术标准，是否有扎实的理论基础
- 原创性：是否有新颖的观点和方法
- 完整性：内容是否全面，覆盖所有必要的方面
- 逻辑结构：结构是否清晰，逻辑是否严谨
- 论证深度：分析是否深入，论证是否充分
- 方法论：研究方法是否科学合理
- 数据分析：数据处理和分析是否严谨
- 语言表达：语言是否规范，表达是否清晰准确
- 会议适配度：是否符合目标会议的要求和风格

请按照以下格式输出：

## 整体评分
[0-100的数字]

## 评估维度
[维度1]: [分数]/100
[详细反馈]

[维度2]: [分数]/100
[详细反馈]

...

## 改进建议
1. [具体建议1]
2. [具体建议2]
3. [具体建议3]
4. [具体建议4]
5. [具体建议5]

## 质量结论
[Approved/Rejected]`;

    const userPrompt = `请严格评估以下内容的质量，任务类型：${taskType}

项目信息：
- 项目ID：${context.projectId}
- 项目标题：${context.projectTitle}
- 会议ID：${context.venueId}

内容：
${content}

请从学术性、原创性、完整性、逻辑结构、论证深度、方法论、数据分析、语言表达、会议适配度等维度进行严格评估，确保达到博士生导师评审的高标准。`;

    const result = await generatePaperDraft({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.2
    });

    // 解析质量检查结果
    const qualityContent = result.content;
    const scoreMatch = qualityContent.match(/## 整体评分\n(\d+)/);
    const criteriaMatches = qualityContent.match(/## 评估维度\n([\s\S]*?)\n## 改进建议/);
    const suggestionsMatches = qualityContent.match(/## 改进建议\n([\s\S]*?)\n## 质量结论/);
    const approvedMatch = qualityContent.match(/## 质量结论\n(Approved|Rejected)/);

    const criteria = criteriaMatches ? criteriaMatches[1].trim().split(/\n\n/).map(item => {
      const match = item.match(/^(.*?): (\d+)/);
      return {
        name: match ? match[1] : '',
        score: match ? parseInt(match[2], 10) : 0,
        feedback: item.replace(/^(.*?): \d+\n/, '')
      };
    }) : [];

    const suggestions = suggestionsMatches ? suggestionsMatches[1].trim().split(/\n\d+\. /).filter(Boolean) : [];

    // 增强质量检查的严格性
    const overallScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const approved = (approvedMatch ? approvedMatch[1] === 'Approved' : false) && overallScore >= 80;

    return {
      overallScore,
      criteria,
      suggestions,
      approved
    };
  }

  public static async runTask(taskType: AiTaskType, context: AiTaskContext): Promise<{
    thinking: AiThinkingResult;
    content: AiContentResult;
    quality: AiQualityCheckResult;
    nextSteps: Array<{
      step: string;
      preview: string;
      estimatedTime: number;
    }>;
  }> {
    // 1. AI思考和prompt生成
    const thinking = await this.generateThinking(taskType, context);

    // 2. AI内容生成
    const content = await this.generateContent(thinking.prompt, taskType);

    // 3. AI质量检查
    const quality = await this.checkQuality(content.content, taskType, context);

    // 4. AI预测下一步
    const nextSteps = await this.generateNextSteps(context, {
      thinking,
      content,
      quality
    });

    return {
      thinking,
      content,
      quality,
      nextSteps
    };
  }

  public static async generateNextSteps(context: AiTaskContext, currentResults: any): Promise<Array<{
    step: string;
    preview: string;
    estimatedTime: number;
  }>> {
    const systemPrompt = `你是一个论文写作流程规划专家，根据当前的项目状态和已生成的内容，预测并生成未来两步的内容预览。`;

    const userPrompt = `项目信息：
- 项目ID：${context.projectId}
- 项目标题：${context.projectTitle}
- 会议ID：${context.venueId}

当前步骤：${context.currentStep}

当前结果：
${JSON.stringify(currentResults, null, 2)}

请生成未来两步的内容预览，每步包括：
1. 步骤名称
2. 内容预览（简要描述）
3. 预计完成时间（分钟）`;

    const result = await generatePaperDraft({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.6
    });

    // 解析下一步预览
    const content = result.content;
    const steps = content.split(/\n\d+\. /).filter(Boolean).map(step => {
      const lines = step.split(/\n/);
      return {
        step: lines[0] || '',
        preview: lines.slice(1, -1).join('\n') || '',
        estimatedTime: parseInt(lines[lines.length - 1].match(/预计完成时间：(\d+)分钟/)?.[1] || '10', 10)
      };
    });

    return steps.slice(0, 2);
  }

  public static async generateRevisionSuggestions(content: string, qualityCheck: AiQualityCheckResult, context: AiTaskContext): Promise<Array<{
    section: string;
    issue: string;
    suggestion: string;
    severity: 'high' | 'medium' | 'low';
  }>> {
    const systemPrompt = `你是一个专业的EI论文改稿专家，根据质量检查结果，生成详细、针对性强的改稿意见。你的改稿意见应该：
1. 具体到内容的特定部分
2. 提供详细的修改建议
3. 解释为什么需要修改
4. 给出具体的修改方案
5. 评估修改的紧急程度`;

    const userPrompt = `项目信息：
- 项目ID：${context.projectId}
- 项目标题：${context.projectTitle}
- 会议ID：${context.venueId}

当前内容：
${content}

质量检查结果：
${JSON.stringify(qualityCheck, null, 2)}

请生成详细的改稿意见，每条意见包括：
1. 涉及部分
2. 问题描述
3. 修改建议
4. 严重程度（high/medium/low）`;

    const result = await generatePaperDraft({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.5
    });

    // 解析改稿意见
    const revisionContent = result.content;
    const suggestions = revisionContent.split(/\n\d+\. /).filter(Boolean).map(suggestion => {
      const lines = suggestion.split(/\n/);
      return {
        section: lines[0] || '',
        issue: lines[1] || '',
        suggestion: lines.slice(2, -1).join('\n') || '',
        severity: (lines[lines.length - 1].match(/严重程度：(high|medium|low)/)?.[1] || 'medium') as 'high' | 'medium' | 'low'
      };
    });

    return suggestions;
  }
}
