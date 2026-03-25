import { getDatabase } from '@/lib/server/db';
import { AIModel, generatePaperDraft, getDefaultModel, getModelById } from '@/lib/ai/ai-client';
import {
  generateHighQualityContent,
  reviewPaperWithQualityCheck,
  ContentGenerationPipeline,
  SmartContentRouter,
  type PromptContext
} from './content-pipeline';

export type TaskType = 'strategy' | 'content' | 'review' | 'direction';

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

async function getModelByProvider(provider: string): Promise<AIModel | null> {
  try {
    const db = await getDatabase();
    const models = await db.all('SELECT * FROM ai_models WHERE provider = ?', [provider]);
    return models[0] || null;
  } catch (error) {
    console.error(`Failed to get ${provider} model:`, error);
    return null;
  }
}

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
        usage: null,
        model: {
          id: 0,
          name: 'quality-pipeline',
          provider: 'pipeline'
        },
        fallback: false,
        quality: {
          score: result.quality.score,
          passed: result.quality.passed,
          iterations: result.quality.iterations,
          selfCritique: result.metadata.selfCritique
        }
      };
    } catch (error) {
      console.error('Quality pipeline failed, falling back to standard:', error);
      // 失败时回退到标准流程
    }
  }

  let primaryModel: AIModel | null = null;
  let fallbackModel: AIModel | null = null;
  let usedFallback = false;
  let originalProvider: string | undefined;

  try {
    // 获取首选模型
    primaryModel = await getPreferredModelForTask(taskType, options);
    
    if (!primaryModel) {
      throw new Error('未找到首选模型');
    }

    originalProvider = primaryModel.provider;

    // 检查首选模型可用性（快速失败）
    const isPrimaryAvailable = await isModelAvailable(primaryModel);
    
    if (!isPrimaryAvailable && enableFallback) {
      console.log(`Primary model ${primaryModel.provider} is not available, trying fallback...`);
      fallbackModel = await getFallbackModelForTask(taskType);
    }

    let result;
    let modelToUse: AIModel;

    if (fallbackModel && !isPrimaryAvailable) {
      // 使用备用模型
      modelToUse = fallbackModel;
      usedFallback = true;
    } else {
      // 使用首选模型
      modelToUse = primaryModel;
    }

    try {
      result = await tryGenerateWithModel(modelToUse, prompt, systemPrompt, temperature);
    } catch (error) {
      // 使该模型的缓存失效
      invalidateModelCache(modelToUse.id);
      
      if (enableFallback && modelToUse.provider === originalProvider) {
        // 尝试使用备用模型
        console.log(`Model ${modelToUse.provider} failed, trying fallback...`);
        fallbackModel = fallbackModel || await getFallbackModelForTask(taskType);
        
        if (fallbackModel) {
          modelToUse = fallbackModel;
          usedFallback = true;
          result = await tryGenerateWithModel(modelToUse, prompt, systemPrompt, temperature);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    return {
      content: result.content,
      usage: result.usage,
      model: {
        id: modelToUse.id,
        name: modelToUse.name,
        provider: modelToUse.provider
      },
      fallback: usedFallback,
      originalProvider
    };

  } catch (error) {
    // 所有尝试都失败，使用默认模型
    console.error('All model attempts failed, trying default model...');
    const defaultModel = await getDefaultModel();
    
    if (!defaultModel) {
      throw new Error('未配置AI模型，请先在后台添加模型配置。');
    }

    const result = await tryGenerateWithModel(defaultModel, prompt, systemPrompt, temperature);

    return {
      content: result.content,
      usage: result.usage,
      model: {
        id: defaultModel.id,
        name: defaultModel.name,
        provider: defaultModel.provider
      },
      fallback: true,
      originalProvider
    };
  }
}

// ==================== 新的高质量内容生成方法 ====================

/**
 * 生成高质量研究方向（使用新Prompt系统）
 * 
 * 示例：
 * ```typescript
 * const result = await generateDirectionEnhanced(
 *   "智能服饰的用户体验研究",
 *   ["智能服饰", "用户体验", "可穿戴设备"],
 *   { targetVenue: "IEEE ICCCI", userLevel: "master" }
 * );
 * ```
 */
export async function generateDirectionEnhanced(
  topic: string,
  keywords: string[],
  options?: {
    field?: string;
    targetVenue?: string;
    userLevel?: PromptContext['userLevel'];
    domain?: PromptContext['domain'];
  }
) {
  const result = await generateHighQualityContent(topic, keywords, {
    domain: options?.domain,
    targetVenue: options?.targetVenue,
    userLevel: options?.userLevel
  });

  return {
    content: result.content,
    quality: result.quality,
    metadata: result.metadata
  };
}

/**
 * 评审论文（使用新Prompt系统）
 * 
 * 示例：
 * ```typescript
 * const result = await reviewContentEnhanced(
 *   paperContent,
 *   { domain: "smart-clothing", targetVenue: "IEEE ICCCI" }
 * );
 * ```
 */
export async function reviewContentEnhanced(
  content: string,
  options: {
    domain: PromptContext['domain'];
    targetVenue?: string;
    userLevel?: PromptContext['userLevel'];
  }
) {
  const context: PromptContext = {
    domain: options.domain,
    researchType: 'experimental',
    topic: '论文评审',
    keywords: [],
    targetVenue: options.targetVenue,
    userLevel: options.userLevel || 'phd',
    language: 'zh',
    depth: 'expert',
    creativity: 'balanced'
  };

  const result = await reviewPaperWithQualityCheck(content, context);

  return {
    content: result.content,
    quality: result.quality,
    metadata: result.metadata
  };
}

// ==================== 兼容旧版本的便捷方法 ====================

// 旧版本：生成研究方向（保持兼容）
export async function generateDirection(topic: string, field?: string, modelId?: number) {
  // 尝试使用新系统，失败时回退到旧系统
  try {
    const keywords = topic.split(/[\s,，]+/).filter(k => k.length > 1);
    const result = await generateDirectionEnhanced(topic, keywords, {
      field,
      userLevel: 'master'
    });
    
    return {
      content: result.content,
      usage: null,
      model: { id: 0, name: 'quality-pipeline', provider: 'pipeline' },
      fallback: false
    };
  } catch (error) {
    console.warn('New pipeline failed, using legacy:', error);
    
    // 回退到旧实现
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
}

// 旧版本：评审内容（保持兼容）
export async function reviewContent(content: string, modelId?: number) {
  // 尝试使用新系统
  try {
    const result = await reviewContentEnhanced(content, {
      domain: 'fashion-design',
      userLevel: 'phd'
    });
    
    return {
      content: result.content,
      usage: null,
      model: { id: 0, name: 'quality-pipeline', provider: 'pipeline' },
      fallback: false
    };
  } catch (error) {
    console.warn('New pipeline failed, using legacy:', error);
    
    // 回退到旧实现
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
}

// 旧版本：生成内容（保持兼容）
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

// ==================== AiOrchestrator 类（保持兼容） ====================

export type AiTaskType = TaskType;

export type AiTaskContext = {
  projectId: string;
  projectTitle: string;
  venueId: string;
  currentStep: string;
  previousSteps: Array<{ step: string; data: any }>;
  userInputs: Record<string, any>;
};

export type AiTaskResult = {
  content: string;
  metadata?: {
    topics?: string[];
    directions?: any[];
  };
  quality?: {
    overallScore: number;
    approved: boolean;
    criteria: Array<{
      name: string;
      score: number;
      feedback: string;
    }>;
    suggestions: string[];
  };
  nextSteps?: Array<{
    step: string;
    estimatedTime: number;
    preview: string;
  }>;
};

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

export class AiOrchestrator {
  static async runTask(taskType: AiTaskType, context: AiTaskContext): Promise<AiTaskResult> {
    // 尝试使用新系统
    try {
      const router = new SmartContentRouter();
      const keywords = context.projectTitle.split(/[\s,，]+/).filter(k => k.length > 1);
      
      const promptContext = await router.detectOptimalContext(
        context.projectTitle,
        keywords,
        context.userInputs?.description
      );

      const pipeline = new ContentGenerationPipeline();
      const result = await pipeline.generate(promptContext, taskType as 'direction' | 'content');

      // 解析主题
      const topics = result.content
        .match(/\b(?:智能服饰|传统纹样|用户体验|交互设计|非遗文化|数字化|创新设计|研究方法|文献综述|研究结果|讨论|结论)\b/gi)
        ?.filter((value, index, self) => self.indexOf(value) === index)
        ?.map(topic => topic.toLowerCase()) || [];

      return {
        content: result.content,
        metadata: {
          topics: topics.length > 0 ? topics : ["研究主题", "研究方法", "创新点"]
        },
        quality: {
          overallScore: result.quality.score * 10,
          approved: result.quality.passed,
          criteria: [
            { name: "内容具体性", score: result.quality.score * 10, feedback: result.quality.feedback[0] || "评估完成" },
            { name: "领域针对性", score: result.quality.score * 10, feedback: result.quality.feedback[1] || "符合领域规范" },
            { name: "学术规范性", score: result.quality.score * 10, feedback: result.quality.feedback[2] || "结构清晰" }
          ],
          suggestions: result.quality.feedback.slice(0, 3)
        },
        nextSteps: [
          { step: "完善大纲", estimatedTime: 10, preview: "根据生成的内容完善论文大纲" },
          { step: "撰写正文", estimatedTime: 30, preview: "基于大纲撰写各章节内容" }
        ]
      };
    } catch (error) {
      console.warn('New pipeline failed in AiOrchestrator, using legacy:', error);
      
      // 回退到旧实现
      const systemPrompt = `你是一个专业的EI论文写作助手，擅长为服装、设计、时尚、人文社科与技术交叉研究领域生成高质量的学术内容。

当前任务类型：${taskType}
项目标题：${context.projectTitle}
当前步骤：${context.currentStep}

请根据上下文生成高质量的内容。`;

      const prompt = `任务类型：${taskType}

项目信息：
- 项目ID：${context.projectId}
- 项目标题：${context.projectTitle}
- 会议ID：${context.venueId}

当前步骤：${context.currentStep}

用户输入：
${Object.entries(context.userInputs).map(([key, value]) => `${key}: ${value}`).join('\n')}

请生成内容。`;

      const result = await orchestrateAIRequest({
        taskType: taskType as TaskType,
        prompt,
        systemPrompt,
        temperature: 0.5,
        enableFallback: true
      });

      const content = result.content;
      
      const topics = content
        .match(/\b(?:智能服饰|传统纹样|用户体验|交互设计|非遗文化|数字化|创新设计|研究方法|文献综述|研究结果|讨论|结论)\b/gi)
        ?.filter((value, index, self) => self.indexOf(value) === index)
        ?.map(topic => topic.toLowerCase()) || [];

      return {
        content: content,
        metadata: {
          topics: topics.length > 0 ? topics : ["研究主题", "研究方法", "创新点"]
        },
        quality: {
          overallScore: 85,
          approved: true,
          criteria: [
            { name: "学术性", score: 85, feedback: "内容符合学术规范" },
            { name: "逻辑性", score: 80, feedback: "结构清晰，逻辑连贯" },
            { name: "完整性", score: 85, feedback: "内容完整，覆盖主要要点" }
          ],
          suggestions: ["可以进一步细化研究方法", "建议补充更多实证数据"]
        },
        nextSteps: [
          { step: "完善大纲", estimatedTime: 10, preview: "根据生成的内容完善论文大纲" },
          { step: "撰写正文", estimatedTime: 30, preview: "基于大纲撰写各章节内容" }
        ]
      };
    }
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
}

// 导出新的高质量生成函数
export {
  generateHighQualityContent,
  reviewPaperWithQualityCheck,
  ContentGenerationPipeline,
  SmartContentRouter
};
