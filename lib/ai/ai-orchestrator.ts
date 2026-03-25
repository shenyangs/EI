import { getDatabase } from '@/lib/server/db';
import { AIModel, generatePaperDraft, getDefaultModel, getModelById, getModelByProvider } from '@/lib/ai/ai-client';
import {
  generateHighQualityContent,
  reviewPaperWithQualityCheck,
  ContentGenerationPipeline,
  SmartContentRouter,
  type PromptContext
} from './content-pipeline';

export type TaskType = 'strategy' | 'content' | 'review' | 'direction';
export type AiTaskType = TaskType | 'topic_analysis' | 'outline_generation' | 'project_initialization' | 'content_generation' | 'quality_review' | 'revision_suggestions';

interface AiModuleConfig {
  id?: number;
  moduleKey: string;
  moduleName?: string;
  modelId?: number | null;
  useAutomatic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 任务类型到模块键的映射
const TASK_TYPE_TO_MODULE_KEY: Record<TaskType, string> = {
  strategy: 'paper_guidance',
  content: 'content_generation',
  review: 'review',
  direction: 'direction'
};

export interface OrchestratorOptions {
  taskType: TaskType;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  minimaxModelId?: number;
  geminiModelId?: number;
  enableFallback?: boolean;
  // 新增：高质量内容生成选项
  useQualityPipeline?: boolean;
  context?: Partial<PromptContext>;
}

interface OrchestratorResult {
  content: string;
  usage: any;
  model: {
    id: number;
    name: string;
    provider: string;
  };
  fallback: boolean;
  originalProvider?: string;
  // 新增：质量信息
  quality?: {
    score: number;
    passed: boolean;
    iterations: number;
    selfCritique?: string;
  };
}

// 模型可用性缓存
const modelAvailabilityCache = new Map<string, { available: boolean; lastChecked: number }>();
const CACHE_DURATION = 60000; // 1分钟

async function isModelAvailable(model: AIModel): Promise<boolean> {
  const cacheKey = `model_${model.id}`;
  const cached = modelAvailabilityCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.lastChecked < CACHE_DURATION) {
    return cached.available;
  }

  try {
    const { probeModelConnection } = await import('@/lib/ai/ai-client');
    const available = await probeModelConnection(model);
    modelAvailabilityCache.set(cacheKey, { available, lastChecked: now });
    return available;
  } catch (error) {
    console.error(`Failed to check model ${model.id} availability:`, error);
    modelAvailabilityCache.set(cacheKey, { available: false, lastChecked: now });
    return false;
  }
}

function invalidateModelCache(modelId: number) {
  const cacheKey = `model_${modelId}`;
  modelAvailabilityCache.delete(cacheKey);
}

async function getModuleConfig(taskType: TaskType): Promise<AiModuleConfig | null> {
  try {
    const moduleKey = TASK_TYPE_TO_MODULE_KEY[taskType];
    const db = await getDatabase();
    const config = await db.get('SELECT * FROM ai_module_configs WHERE moduleKey = ?', [moduleKey]);
    return config as AiModuleConfig | null;
  } catch (error) {
    console.error('Failed to get module config:', error);
    return null;
  }
}

async function getPreferredModelForTask(taskType: TaskType, options: OrchestratorOptions): Promise<AIModel | null> {
  let model: AIModel | null = null;

  // 首先检查模块配置
  const moduleConfig = await getModuleConfig(taskType);
  
  // 如果配置了非自动模式且有指定模型，使用配置的模型
  if (moduleConfig && !moduleConfig.useAutomatic && moduleConfig.modelId) {
    model = await getModelById(moduleConfig.modelId);
    if (model) {
      return model;
    }
  }

  // 否则使用默认的智能选择逻辑
  switch (taskType) {
    case 'strategy':
    case 'review':
    case 'direction':
      // 策略、评审、方向生成任务首选Gemini
      if (options.geminiModelId) {
        model = await getModelById(options.geminiModelId);
      }
      if (!model) {
        model = await getModelByProvider('google');
      }
      break;
    case 'content':
      // 内容生成任务首选Minimax
      if (options.minimaxModelId) {
        model = await getModelById(options.minimaxModelId);
      }
      if (!model) {
        model = await getModelByProvider('minimax');
      }
      break;
  }

  return model;
}

async function getFallbackModelForTask(taskType: TaskType): Promise<AIModel | null> {
  switch (taskType) {
    case 'strategy':
    case 'review':
    case 'direction':
      // 策略类任务失败时，尝试用Minimax
      return await getModelByProvider('minimax');
    case 'content':
      // 内容生成任务失败时，尝试用Gemini
      return await getModelByProvider('google');
    default:
      return null;
  }
}

async function tryGenerateWithModel(
  model: AIModel,
  prompt: string,
  systemPrompt?: string,
  temperature: number = 0.5
): Promise<{ content: string; usage: any }> {
  const result = await generatePaperDraft({
    prompt,
    systemPrompt,
    temperature,
    modelId: model.id
  });

  return {
    content: result.content,
    usage: result.usage
  };
}

export async function orchestrateAIRequest(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const { 
    taskType, 
    prompt, 
    systemPrompt, 
    temperature = 0.5, 
    enableFallback = true,
    useQualityPipeline = false,
    context
  } = options;

  // 如果使用高质量管道，直接调用新系统
  if (useQualityPipeline && context) {
    try {
      const pipeline = new ContentGenerationPipeline();
      const result = await pipeline.generate(
        context as PromptContext,
        taskType as 'direction' | 'review' | 'content'
      );

      return {
        content: result.content,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: { id: 0, name: 'Pipeline', provider: 'internal' },
        fallback: false,
        quality: result.quality
      };
    } catch (error) {
      console.warn('Quality pipeline failed, falling back to standard orchestration:', error);
      // 继续执行标准流程
    }
  }

  // 标准AI协调流程
  const primaryModel = await getPreferredModelForTask(taskType, options);

  if (!primaryModel) {
    throw new Error('没有可用的AI模型，请检查模型配置。');
  }

  const originalProvider = primaryModel.provider;
  let fallbackModel: AIModel | null = null;
  let usedFallback = false;

  // 尝试使用首选模型
  try {
    // 检查模型可用性
    const isAvailable = await isModelAvailable(primaryModel);
    
    if (!isAvailable && enableFallback) {
      // 首选模型不可用，尝试备用模型
      fallbackModel = await getFallbackModelForTask(taskType);
      
      if (fallbackModel && await isModelAvailable(fallbackModel)) {
        const result = await tryGenerateWithModel(
          fallbackModel,
          prompt,
          systemPrompt,
          temperature
        );
        
        usedFallback = true;
        invalidateModelCache(primaryModel.id);

        return {
          content: result.content,
          usage: result.usage,
          model: {
            id: fallbackModel.id,
            name: fallbackModel.name,
            provider: fallbackModel.provider
          },
          fallback: true,
          originalProvider
        };
      }
    }

    // 使用首选模型生成
    const result = await tryGenerateWithModel(
      primaryModel,
      prompt,
      systemPrompt,
      temperature
    );

    return {
      content: result.content,
      usage: result.usage,
      model: {
        id: primaryModel.id,
        name: primaryModel.name,
        provider: primaryModel.provider
      },
      fallback: false
    };
  } catch (error) {
    console.error(`Primary model ${primaryModel.name} failed:`, error);
    invalidateModelCache(primaryModel.id);

    if (!enableFallback) {
      throw error;
    }

    // 尝试备用模型
    fallbackModel = fallbackModel || await getFallbackModelForTask(taskType);
    
    if (!fallbackModel) {
      throw new Error('没有可用的备用模型。');
    }

    try {
      const result = await tryGenerateWithModel(
        fallbackModel,
        prompt,
        systemPrompt,
        temperature
      );

      usedFallback = true;

      return {
        content: result.content,
        usage: result.usage,
        model: {
          id: fallbackModel.id,
          name: fallbackModel.name,
          provider: fallbackModel.provider
        },
        fallback: true,
        originalProvider
      };
    } catch (fallbackError) {
      console.error(`Fallback model ${fallbackModel.name} also failed:`, fallbackError);
      throw new Error('所有可用模型都失败了，请检查模型配置和网络连接。');
    }
  }
}

// 特定任务的便捷方法
export async function generateDirection(topic: string, field?: string, modelId?: number) {
  const systemPrompt = `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术方向顾问。基于用户提供的主题，生成3-5个具体的研究方向，每个方向包括：
1. 方向名称
2. 简要描述（1-2句话）
3. 研究价值
4. 可行性分析

输出必须结构清晰、学术表达克制，不要输出思考过程。`;

  const prompt = `请为主题"${topic}"${field ? ` 在${field}领域` : ''}生成具体的研究方向建议。`;

  return orchestrateAIRequest({
    taskType: 'direction',
    prompt,
    systemPrompt,
    temperature: 0.7,
    geminiModelId: modelId,
    enableFallback: true
  });
}

export async function reviewContent(content: string, modelId?: number) {
  const systemPrompt = `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文评审专家。请对用户提供的稿件进行全面评估，并提供具体的改进建议。评估应包括：
1. 整体质量评分（1-10分）
2. 主要优点
3. 主要问题
4. 具体改进建议
5. 结构优化建议

输出必须结构清晰、学术表达克制，不要输出思考过程。`;

  const prompt = `请对以下稿件进行评审并提供改进建议：\n\n${content}`;

  return orchestrateAIRequest({
    taskType: 'review',
    prompt,
    systemPrompt,
    temperature: 0.5,
    geminiModelId: modelId,
    enableFallback: true
  });
}

export async function generateContent(prompt: string, systemPrompt?: string, modelId?: number) {
  return orchestrateAIRequest({
    taskType: 'content',
    prompt,
    systemPrompt,
    temperature: 0.5,
    minimaxModelId: modelId,
    enableFallback: true
  });
}

// 新增：高质量内容生成方法
export async function generateHighQualityDirection(
  topic: string,
  context: Partial<PromptContext>
) {
  const pipeline = new ContentGenerationPipeline();
  return await pipeline.generate(
    context as PromptContext,
    'direction'
  );
}

export async function generateHighQualityReview(
  content: string,
  context: Partial<PromptContext>
) {
  const pipeline = new ContentGenerationPipeline();
  return await pipeline.generate(
    context as PromptContext,
    'review',
    content
  );
}

export async function generateHighQualityPaperContent(
  context: PromptContext
) {
  const pipeline = new ContentGenerationPipeline();
  return await pipeline.generate(context, 'content');
}

// 新增：智能内容路由
export function createSmartRouter() {
  return new SmartContentRouter();
}

// 新增：增强版研究方向生成
export async function generateDirectionEnhanced(
  topic: string,
  keywords: string[],
  options: {
    domain?: PromptContext["domain"];
    targetVenue?: string;
    userLevel?: PromptContext["userLevel"];
  } = {}
) {
  const promptContext: PromptContext = {
    domain: options.domain || "fashion-design",
    researchType: "experimental",
    topic,
    keywords,
    userLevel: options.userLevel || "master",
    language: "zh",
    depth: "detailed",
    creativity: "balanced",
  };

  const pipeline = new ContentGenerationPipeline();
  const result = await pipeline.generate(promptContext, "direction");

  return {
    content: result.content,
    quality: result.quality || {
      score: 7,
      passed: true,
      iterations: 1,
    },
    metadata: {
      domain: promptContext.domain,
      generationTime: Date.now(),
    },
  };
}

// 新增：增强版内容评审
export async function reviewContentEnhanced(
  content: string,
  options: {
    domain?: PromptContext["domain"];
    targetVenue?: string;
    userLevel?: PromptContext["userLevel"];
  } = {}
) {
  const promptContext: PromptContext = {
    domain: options.domain || "fashion-design",
    researchType: "experimental",
    topic: "",
    keywords: [],
    userLevel: options.userLevel || "master",
    language: "zh",
    depth: "detailed",
    creativity: "balanced",
  };

  const pipeline = new ContentGenerationPipeline();
  const result = await pipeline.generate(promptContext, "review", content);

  return {
    content: result.content,
    quality: result.quality || {
      score: 7,
      passed: true,
      iterations: 1,
    },
    metadata: {
      domain: promptContext.domain,
      generationTime: Date.now(),
    },
  };
}

// 任务上下文
export interface AiTaskContext {
  projectTitle: string;
  currentStep: string;
  currentChapter?: string;
  chapterGoal?: string;
}

// 新增：AI编排器类（用于向后兼容）
export class AiOrchestrator {
  static async runTask(
    taskType: string,
    content: string,
    context: AiTaskContext,
    options?: {
      modelId?: number;
      temperature?: number;
    }
  ) {
    switch (taskType) {
      case 'topic_analysis':
        return this.analyzeTopic(content, context);
      case 'content_generation':
        return this.generateContent(content, context, options);
      case 'quality_review':
        return this.reviewQuality(content, context);
      case 'revision_suggestions':
        return this.generateRevisionSuggestions(content, { score: 7, passed: true, iterations: 1 }, context);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  static async analyzeTopic(topic: string, context: AiTaskContext) {
    // 使用新系统分析主题
    const promptContext: PromptContext = {
      domain: 'fashion-design',
      researchType: 'experimental',
      topic,
      keywords: topic.split(/[\s,，]+/).filter(k => k.length > 1),
      userLevel: 'master',
      language: 'zh',
      depth: 'detailed',
      creativity: 'balanced'
    };

    const pipeline = new ContentGenerationPipeline();
    const result = await pipeline.generate(promptContext, 'direction');

    return {
      ok: true,
      data: {
        keywords: promptContext.keywords,
        outline: result.content,
        suggestions: result.quality?.feedback?.length
          ? result.quality.feedback
          : ['建议进一步细化研究方向']
      }
    };
  }

  static async generateContent(
    prompt: string,
    context: AiTaskContext,
    options?: { modelId?: number; temperature?: number }
  ) {
    // 使用新系统生成内容
    const promptContext: PromptContext = {
      domain: 'fashion-design',
      researchType: 'experimental',
      topic: context.projectTitle,
      keywords: context.projectTitle.split(/[\s,，]+/).filter(k => k.length > 1),
      userLevel: 'master',
      language: 'zh',
      depth: 'detailed',
      creativity: 'balanced'
    };

    const pipeline = new ContentGenerationPipeline();
    const result = await pipeline.generate(promptContext, 'content', prompt);

    return {
      ok: true,
      data: {
        content: result.content,
        quality: result.quality
      }
    };
  }

  static async reviewQuality(content: string, context: AiTaskContext) {
    // 使用新系统进行质量评审
    const promptContext: PromptContext = {
      domain: 'fashion-design',
      researchType: 'experimental',
      topic: context.projectTitle,
      keywords: context.projectTitle.split(/[\s,，]+/).filter(k => k.length > 1),
      userLevel: 'master',
      language: 'zh',
      depth: 'detailed',
      creativity: 'balanced'
    };

    const pipeline = new ContentGenerationPipeline();
    const result = await pipeline.generate(promptContext, 'review', content);

    return {
      ok: true,
      data: {
        quality: result.quality || { score: 7, passed: true, iterations: 1 },
        suggestions: result.content
          .split('\n')
          .filter(line => line.trim())
          .slice(0, 5)
      }
    };
  }

  static async generateRevisionSuggestions(content: string, quality: any, context: AiTaskContext): Promise<any[]> {
    try {
      const systemPrompt = `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文改稿专家。基于提供的稿件和质量报告，生成具体的改稿建议。

输出必须为JSON数组格式，每个建议包含：
- section: 建议修改的章节名称
- issue: 具体问题描述
- suggestion: 具体的修改建议
- severity: 严重程度（high/medium/low）

不要输出思考过程，直接输出JSON数组。`;

      const prompt = `请为以下稿件生成改稿建议：

【稿件内容】
${content.substring(0, 3000)}

【质量报告】
${JSON.stringify(quality, null, 2)}

【项目信息】
- 标题：${context.projectTitle}
- 当前步骤：${context.currentStep}

请生成3-5条具体的改稿建议，每条建议都要有明确的修改方向和可操作的建议。`;

      const result = await orchestrateAIRequest({
        taskType: 'review',
        prompt,
        systemPrompt,
        temperature: 0.5,
        enableFallback: true
      });

      // 尝试解析JSON
      try {
        const jsonMatch = result.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            return suggestions.map(s => ({
              section: s.section || '未指定章节',
              issue: s.issue || '未描述问题',
              suggestion: s.suggestion || '未提供建议',
              severity: ['high', 'medium', 'low'].includes(s.severity) ? s.severity : 'medium'
            }));
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse revision suggestions as JSON:', parseError);
      }

      // 如果解析失败，从内容中提取建议
      const lines = result.content.split('\n').filter(line => line.trim());
      const suggestions: any[] = [];
      let currentSuggestion: any = {};

      for (const line of lines) {
        if (line.includes('章节') || line.includes('section')) {
          if (currentSuggestion.section) {
            suggestions.push(currentSuggestion);
          }
          currentSuggestion = { section: line.replace(/.*?[:：]\s*/, ''), severity: 'medium' };
        } else if (line.includes('问题') || line.includes('issue')) {
          currentSuggestion.issue = line.replace(/.*?[:：]\s*/, '');
        } else if (line.includes('建议') || line.includes('suggestion')) {
          currentSuggestion.suggestion = line.replace(/.*?[:：]\s*/, '');
        }
      }

      if (currentSuggestion.section) {
        suggestions.push(currentSuggestion);
      }

      return suggestions.length > 0 ? suggestions : getDefaultSuggestions();
    } catch (error) {
      console.error('Failed to generate revision suggestions:', error);
      return getDefaultSuggestions();
    }
  }

  static async generateWorkPlan(context: AiTaskContext) {
    // 生成工作计划
    return {
      ok: true,
      data: {
        steps: [
          { step: "确定研究方向", estimatedTime: 15, preview: "分析主题并确定研究角度" },
          { step: "文献调研", estimatedTime: 30, preview: "搜索相关文献并整理参考" },
          { step: "撰写大纲", estimatedTime: 20, preview: "构建论文整体结构框架" },
          { step: "撰写正文", estimatedTime: 30, preview: "基于大纲撰写各章节内容" }
        ]
      }
    };
  }
}

function getDefaultSuggestions() {
  return [
    {
      section: "引言",
      issue: "研究背景描述不够充分",
      suggestion: "建议补充更多关于研究领域的背景信息",
      severity: "medium"
    },
    {
      section: "方法",
      issue: "研究方法描述过于简略",
      suggestion: "建议详细说明数据收集和分析方法",
      severity: "high"
    }
  ];
}
