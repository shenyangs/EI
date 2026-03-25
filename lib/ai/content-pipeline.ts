// AI内容生成管道 - 用AI监督AI，确保输出质量
// 核心理念：生成→评估→迭代→输出

import {
  generateDynamicPrompt,
  evaluateContentQuality,
  type PromptContext,
  type GeneratedPrompt,
  qualityEvaluator,
  DOMAIN_EXPERTS
} from './prompt-engine';
import { generatePaperDraft, type AIModel } from './ai-client';

// 管道配置
export interface PipelineConfig {
  maxIterations: number;        // 最大迭代次数
  qualityThreshold: number;     // 质量阈值（0-10）
  enableSelfCritique: boolean;  // 是否启用自我批评
  enableMultiModel: boolean;    // 是否使用多模型验证
  timeoutMs: number;            // 超时时间
}

// 管道结果
export interface PipelineResult {
  content: string;
  quality: {
    score: number;
    passed: boolean;
    feedback: string[];
    iterations: number;
  };
  metadata: {
    domain: string;
    researchType: string;
    generationTime: number;
    modelUsed: string;
    selfCritique?: string;
  };
}

// 默认配置
const DEFAULT_CONFIG: PipelineConfig = {
  maxIterations: 3,
  qualityThreshold: 7.0,
  enableSelfCritique: true,
  enableMultiModel: false,
  timeoutMs: 120000
};

// 内容生成管道
export class ContentGenerationPipeline {
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 主入口：生成高质量内容
  async generate(
    context: PromptContext,
    taskType: 'direction' | 'review' | 'content' | 'outline',
    existingContent?: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    // 1. 生成动态Prompt
    const prompt = await generateDynamicPrompt(context);
    
    // 2. 生成初始内容
    let content = await this.generateContent(prompt, context, taskType, existingContent);
    
    // 3. 质量评估与迭代
    let iteration = 0;
    let quality = await evaluateContentQuality(content, context);
    
    while (!quality.passed && iteration < this.config.maxIterations) {
      iteration++;
      
      // 生成改进建议
      const improvementPrompt = this.generateImprovementPrompt(content, quality.feedback, context);
      
      // 重新生成
      const improved = await generatePaperDraft({
        prompt: improvementPrompt,
        systemPrompt: prompt.systemPrompt,
        temperature: 0.4 + (iteration * 0.1) // 逐步提高温度以增加多样性
      });
      
      content = improved.content;
      quality = await evaluateContentQuality(content, context);
    }
    
    // 4. 自我批评（可选）
    let selfCritique: string | undefined;
    if (this.config.enableSelfCritique && quality.score >= 7) {
      selfCritique = await this.generateSelfCritique(content, context);
    }
    
    const generationTime = Date.now() - startTime;
    
    return {
      content,
      quality: {
        score: quality.score,
        passed: quality.passed,
        feedback: quality.feedback,
        iterations: iteration
      },
      metadata: {
        domain: context.domain,
        researchType: context.researchType,
        generationTime,
        modelUsed: 'default',
        selfCritique
      }
    };
  }

  // 生成内容
  private async generateContent(
    prompt: GeneratedPrompt,
    context: PromptContext,
    taskType: string,
    existingContent?: string
  ): Promise<string> {
    let userPrompt = prompt.userPrompt;
    
    // 根据任务类型调整Prompt
    switch (taskType) {
      case 'review':
        if (existingContent) {
          userPrompt = `请对以下论文进行专业评审：\n\n${existingContent}\n\n${userPrompt}`;
        }
        break;
      case 'outline':
        userPrompt += '\n\n请生成详细的论文大纲，包括每个章节的要点和预期字数。';
        break;
    }
    
    const result = await generatePaperDraft({
      prompt: userPrompt,
      systemPrompt: prompt.systemPrompt,
      temperature: context.creativity === 'innovative' ? 0.7 : context.creativity === 'conservative' ? 0.3 : 0.5
    });
    
    return result.content;
  }

  // 生成改进Prompt
  private generateImprovementPrompt(
    content: string,
    feedback: string[],
    context: PromptContext
  ): string {
    const expert = DOMAIN_EXPERTS[context.domain];
    
    return `你是一位资深的${expert.role}。之前生成的内容存在以下问题，请改进后重新生成：

【需要改进的问题】
${feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}

【原内容】
${content.substring(0, 1500)}...

【改进要求】
1. 针对上述问题逐一改进
2. 保持内容的学术性和专业性
3. 确保建议具体、可操作
4. 增强领域针对性（${expert.researchTrends.slice(0, 3).join('、')}）
5. 避免空洞表述，提供具体例子

请直接输出改进后的完整内容。`;
  }

  // 生成自我批评
  private async generateSelfCritique(content: string, context: PromptContext): Promise<string> {
    const expert = DOMAIN_EXPERTS[context.domain];
    
    const critiquePrompt = `作为一位${expert.role}，请对以下内容进行自我批评：

【内容】
${content.substring(0, 2000)}...

请从以下维度进行批评：
1. 最大的局限性是什么？
2. 哪些建议可能不够准确或过于笼统？
3. 遗漏了哪些重要的考虑因素？
4. 如果用户完全按照这些建议执行，可能遇到什么困难？

请用简洁的语言指出问题，帮助用户更批判性地使用这些建议。`;

    try {
      const result = await generatePaperDraft({
        prompt: critiquePrompt,
        temperature: 0.3
      });
      return result.content;
    } catch {
      return '';
    }
  }

  // 批量生成对比
  async generateComparative(
    context: PromptContext,
    variations: Partial<PromptContext>[]
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    
    for (const variation of variations) {
      const variedContext = { ...context, ...variation };
      const result = await this.generate(variedContext, 'direction');
      results.push(result);
    }
    
    return results;
  }
}

// 智能内容路由
export class SmartContentRouter {
  
  // 根据用户输入自动检测最佳配置
  async detectOptimalContext(
    topic: string,
    keywords: string[],
    userHint?: string
  ): Promise<PromptContext> {
    // 领域检测Prompt
    const detectionPrompt = `请分析以下研究主题，判断最相关的学术领域：

【主题】${topic}
【关键词】${keywords.join('、')}
${userHint ? `【用户补充】${userHint}` : ''}

可选领域：
- fashion-design: 服装设计（服装美学、可持续时尚、数字化设计）
- textile-engineering: 纺织工程（功能性纺织品、智能材料、制造工艺）
- interaction-design: 交互设计（人机交互、可穿戴交互、触觉反馈）
- digital-humanities: 数字人文（文化遗产数字化、人文计算）
- cultural-heritage: 文化遗产（传统技艺保护、非遗数字化）
- smart-clothing: 智能服饰（可穿戴计算、电子纺织品、健康监测）
- user-experience: 用户体验（体验设计、情感体验、服务设计）
- design-theory: 设计理论（设计方法论、设计知识、批判性设计）

请输出JSON格式：
{
  "domain": "最匹配的领域ID",
  "confidence": 0-1的置信度,
  "reasoning": "选择理由（2-3句）",
  "researchType": "experimental/design-case/theoretical/review/methodology/application",
  "suggestedDepth": "overview/detailed/expert",
  "suggestedCreativity": "conservative/balanced/innovative"
}`;

    try {
      const result = await generatePaperDraft({
        prompt: detectionPrompt,
        temperature: 0.3
      });
      
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const detection = JSON.parse(jsonMatch[0]);
        
        return {
          domain: detection.domain,
          researchType: detection.researchType,
          topic,
          keywords,
          userLevel: 'master',
          language: 'zh',
          depth: detection.suggestedDepth,
          creativity: detection.suggestedCreativity
        };
      }
    } catch (error) {
      console.error('领域检测失败:', error);
    }
    
    // 默认返回
    return {
      domain: 'fashion-design',
      researchType: 'experimental',
      topic,
      keywords,
      userLevel: 'master',
      language: 'zh',
      depth: 'detailed',
      creativity: 'balanced'
    };
  }
}

// 内容增强器
export class ContentEnhancer {
  
  // 为内容添加具体例子
  async addExamples(content: string, context: PromptContext): Promise<string> {
    const expert = DOMAIN_EXPERTS[context.domain];
    
    const enhancementPrompt = `请为以下内容添加具体的例子和案例：

【原内容】
${content}

【要求】
1. 为每个主要建议提供1-2个具体例子
2. 例子应该来自${expert.keyJournals.slice(0, 2).join('、')}等期刊的典型研究
3. 不要编造具体的文献，但描述应该符合该领域的典型做法
4. 例子应该帮助用户理解如何实际操作

请输出增强后的完整内容。`;

    const result = await generatePaperDraft({
      prompt: enhancementPrompt,
      temperature: 0.5
    });
    
    return result.content;
  }

  // 为内容添加批判性视角
  async addCriticalPerspective(content: string, context: PromptContext): Promise<string> {
    const expert = DOMAIN_EXPERTS[context.domain];
    
    const critiquePrompt = `请为以下内容添加批判性视角和局限性说明：

【原内容】
${content}

【要求】
1. 指出这些建议的潜在局限性和适用边界
2. 说明在什么情况下这些建议可能不适用
3. 提供替代思路或补充视角
4. 帮助用户建立批判性思维，而不是盲目跟随

请用"批判性提示"或"局限性说明"的章节形式添加。`;

    const result = await generatePaperDraft({
      prompt: critiquePrompt,
      temperature: 0.4
    });
    
    return result.content;
  }

  // 根据目标会议调整内容风格
  async adaptToVenue(content: string, venueId: string): Promise<string> {
    const adaptationPrompt = `请根据目标会议调整以下内容的研究重点和表述风格：

【原内容】
${content}

【目标会议】${venueId}

【调整要求】
1. 强调该会议重视的研究维度
2. 调整创新点的表述方式以符合会议偏好
3. 补充该会议常见的实验设计或验证方式
4. 调整语言和格式以符合会议要求

请输出调整后的内容。`;

    const result = await generatePaperDraft({
      prompt: adaptationPrompt,
      temperature: 0.4
    });
    
    return result.content;
  }
}

// 导出便捷函数
export async function generateHighQualityContent(
  topic: string,
  keywords: string[],
  options?: {
    domain?: PromptContext['domain'];
    researchType?: PromptContext['researchType'];
    userLevel?: PromptContext['userLevel'];
    targetVenue?: string;
  }
): Promise<PipelineResult> {
  const router = new SmartContentRouter();
  const pipeline = new ContentGenerationPipeline();
  
  // 自动检测或手动指定上下文
  const context: PromptContext = options?.domain 
    ? {
        domain: options.domain,
        researchType: options.researchType || 'experimental',
        topic,
        keywords,
        targetVenue: options.targetVenue,
        userLevel: options.userLevel || 'master',
        language: 'zh',
        depth: 'detailed',
        creativity: 'balanced'
      }
    : await router.detectOptimalContext(topic, keywords);
  
  return pipeline.generate(context, 'direction');
}

export async function reviewPaperWithQualityCheck(
  paperContent: string,
  context: PromptContext
): Promise<PipelineResult> {
  const pipeline = new ContentGenerationPipeline();
  return pipeline.generate(context, 'review', paperContent);
}

// 重新导出类型
export type { PromptContext } from './prompt-engine';
