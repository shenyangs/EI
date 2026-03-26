import { getDatabase } from '@/lib/server/db';
import { isCertificateChainError, requestTextWithCurl } from '@/lib/curl-transport';

// 缓存配置
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟
const MAX_CACHE_SIZE = 100; // 最大缓存条目数

// 缓存对象
const cache = new Map<string, { data: any; timestamp: number }>();

// 生成缓存键
function generateCacheKey(modelId: number, prompt: string, systemPrompt?: string, temperature?: number): string {
  return `${modelId}:${temperature || 0.5}:${systemPrompt || ''}:${prompt}`;
}

// 清理过期缓存
function cleanupCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
  
  // 如果缓存大小超过限制，删除最旧的条目
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => cache.delete(key));
  }
}

export interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: string;
}

type GeneratePaperDraftInput = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  modelId?: number;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function stripThinkingBlocks(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
}

async function requestModel(
  model: AIModel,
  body: Record<string, unknown>
) {
  try {
    let endpoint = `${model.baseUrl.replace(/\/$/, '')}/chat/completions`;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`
    };
    let requestBody = body;

    // 处理Gemini模型的特殊格式
    if (model.provider === 'google') {
      endpoint = `${model.baseUrl.replace(/\/$/, '')}/models/${model.model}:generateContent`;
      const messages = body.messages as Array<{ role?: string; content?: string }> | undefined;
      
      // 组合system prompt和user prompt
      let fullText = '';
      if (Array.isArray(messages)) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessage = messages.find(m => m.role === 'user');
        
        if (systemMessage?.content) {
          fullText += systemMessage.content + '\n\n';
        }
        if (userMessage?.content) {
          fullText += userMessage.content;
        }
      }
      
      requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: fullText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: body.temperature || 0.5
        }
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    });

    const text = await response.text();

    if (!response.ok) {
      // 处理特定的HTTP错误码
      if (response.status === 401) {
        throw new Error('AI 服务未授权：请检查 API 密钥配置');
      }
      if (response.status === 429) {
        throw new Error('AI 服务请求过于频繁，请稍后重试');
      }
      if (response.status >= 500) {
        throw new Error('AI 服务暂时不可用，请稍后重试');
      }
      throw new Error(`模型请求失败：${response.status} ${text}`);
    }

    const data = JSON.parse(text);
    
    // 转换Gemini响应格式为OpenAI兼容格式
    if (model.provider === 'google') {
      return {
        choices: [
          {
            message: {
              content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }
          }
        ]
      } as OpenAiCompatibleResponse;
    }

    return data as OpenAiCompatibleResponse;
  } catch (error) {
    if (!isCertificateChainError(error)) {
      throw error;
    }

    let endpoint = `${model.baseUrl.replace(/\/$/, '')}/chat/completions`;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey}`
    };
    let requestBody = body;

    // 处理Gemini模型的特殊格式
    if (model.provider === 'google') {
      endpoint = `${model.baseUrl.replace(/\/$/, '')}/models/${model.model}:generateContent`;
      const messages = body.messages as Array<{ role?: string; content?: string }> | undefined;
      
      // 组合system prompt和user prompt
      let fullText = '';
      if (Array.isArray(messages)) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessage = messages.find(m => m.role === 'user');
        
        if (systemMessage?.content) {
          fullText += systemMessage.content + '\n\n';
        }
        if (userMessage?.content) {
          fullText += userMessage.content;
        }
      }
      
      requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: fullText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: body.temperature || 0.5
        }
      };
    }

    const { status, text } = await requestTextWithCurl({
      url: endpoint,
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      timeoutSeconds: 30
    });

    if (status < 200 || status >= 300) {
      // 处理特定的HTTP错误码
      if (status === 401) {
        throw new Error('AI 服务未授权：请检查 API 密钥配置');
      }
      if (status === 429) {
        throw new Error('AI 服务请求过于频繁，请稍后重试');
      }
      if (status >= 500) {
        throw new Error('AI 服务暂时不可用，请稍后重试');
      }
      throw new Error(`模型请求失败：${status} ${text}`);
    }

    const data = JSON.parse(text);
    
    // 转换Gemini响应格式为OpenAI兼容格式
    if (model.provider === 'google') {
      return {
        choices: [
          {
            message: {
              content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            }
          }
        ]
      } as OpenAiCompatibleResponse;
    }

    return data as OpenAiCompatibleResponse;
  }
}

// 从环境变量创建默认模型配置
function createDefaultModelFromEnv(): AIModel | null {
  const provider = process.env.AI_PROVIDER || "minimax";
  const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
  const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    console.warn('MINIMAX_API_KEY is not configured');
  }
  
  if (!apiKey) {
    return null;
  }
  
  return {
    id: 0,
    name: "默认模型",
    provider,
    model,
    baseUrl,
    apiKey,
    isDefault: true,
    createdAt: new Date().toISOString()
  };
}

// 从环境变量创建Gemini模型配置
function createGeminiModelFromEnv(): AIModel | null {
  const model = process.env.GEMINI_MODEL || "gemini-pro";
  const baseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  return {
    id: 0,
    name: "Gemini",
    provider: "google",
    model,
    baseUrl,
    apiKey,
    isDefault: false,
    createdAt: new Date().toISOString()
  };
}

export async function getDefaultModel(): Promise<AIModel | null> {
  try {
    const db = await getDatabase();
    const model = await db.get('SELECT * FROM ai_models WHERE isDefault = 1');
    if (model) {
      return model;
    }
  } catch (error) {
    console.error('Failed to get default model from database:', error);
  }
  
  // 如果数据库没有，使用环境变量
  return createDefaultModelFromEnv();
}

export async function getModelById(id: number): Promise<AIModel | null> {
  // id为0表示使用环境变量配置
  if (id === 0) {
    return createDefaultModelFromEnv();
  }
  
  try {
    const db = await getDatabase();
    const model = await db.get('SELECT * FROM ai_models WHERE id = ?', [id]);
    return model;
  } catch (error) {
    console.error(`Failed to get model by id ${id}:`, error);
    return null;
  }
}

export async function getModelByProvider(provider: string): Promise<AIModel | null> {
  try {
    const db = await getDatabase();
    const models = await db.all('SELECT * FROM ai_models WHERE provider = ?', [provider]);
    if (models.length > 0) {
      console.log(`Found ${provider} model from database:`, models[0].name);
      return models[0];
    }
  } catch (error) {
    console.error(`Failed to get ${provider} model from database:`, error);
  }
  
  // 如果数据库没有，使用环境变量
  if (provider === 'google') {
    const model = createGeminiModelFromEnv();
    console.log(`Using Gemini model from env:`, model ? 'Yes' : 'No');
    return model;
  } else if (provider === 'minimax') {
    const model = createDefaultModelFromEnv();
    console.log(`Using Minimax model from env:`, model ? 'Yes' : 'No');
    return model;
  }
  
  return null;
}

export async function generatePaperDraft({
  prompt,
  systemPrompt,
  temperature = 0.5,
  modelId
}: GeneratePaperDraftInput) {
  let model: AIModel | null;
  
  if (modelId) {
    model = await getModelById(modelId);
  } else {
    model = await getDefaultModel();
  }

  if (!model) {
    throw new Error('未配置AI模型，请先在后台添加模型配置。');
  }

  // 清理过期缓存
  cleanupCache();
  
  // 生成缓存键
  const cacheKey = generateCacheKey(model.id, prompt, systemPrompt, temperature);
  
  // 检查缓存
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await requestModel(model, {
    model: model.model,
    temperature,
    messages: [
      {
        role: 'system',
        content:
          systemPrompt ??
          '你是一个面向服装、设计、时尚、人文社科与技术交叉研究的 EI 论文写作助手。输出必须结构清晰、学术表达克制，不编造引用，不要输出思考过程、推理标签或<think>内容。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  });
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  const content = rawContent ? stripThinkingBlocks(rawContent) : '';

  if (!content) {
    throw new Error('模型返回成功，但没有拿到正文内容。');
  }

  const result = {
    content,
    usage: data.usage ?? null
  };
  
  // 存入缓存
  cache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}

export async function probeModelConnection(model: AIModel) {
  try {
    const data = await requestModel(model, {
      model: model.model,
      temperature: 0,
      max_tokens: 8,
      messages: [
        {
          role: 'system',
          content: '你是连通性检测助手，只回复一个“通”字。'
        },
        {
          role: 'user',
          content: '连通性检测'
        }
      ]
    });
    const content = data.choices?.[0]?.message?.content?.trim();

    return Boolean(content);
  } catch {
    return false;
  }
}
