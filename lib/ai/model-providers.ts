// AI模型提供商配置
// 支持多种AI模型和提供商

export interface ModelProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: ModelConfig[];
  requestFormat: 'openai' | 'gemini' | 'anthropic' | 'custom';
  responseFormat: 'openai' | 'gemini' | 'anthropic' | 'custom';
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  temperature: {
    min: number;
    max: number;
    default: number;
  };
  pricing: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
  };
  capabilities: string[];
  recommended: boolean;
}

// 支持的模型提供商配置
export const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT系列模型，强大的通用能力',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    requestFormat: 'openai',
    responseFormat: 'openai',
    models: [
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        description: '最先进的模型，适合复杂任务',
        maxTokens: 128000,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.01, output: 0.03 },
        capabilities: ['text-generation', 'code', 'analysis', 'creative-writing'],
        recommended: true
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: '高性能模型，适合大多数任务',
        maxTokens: 8192,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.03, output: 0.06 },
        capabilities: ['text-generation', 'code', 'analysis', 'creative-writing'],
        recommended: false
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '快速且经济，适合简单任务',
        maxTokens: 16385,
        temperature: { min: 0, max: 2, default: 0.7 },
        pricing: { input: 0.0005, output: 0.0015 },
        capabilities: ['text-generation', 'code', 'analysis'],
        recommended: false
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude系列模型，擅长长文本和安全性',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    requestFormat: 'anthropic',
    responseFormat: 'anthropic',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: '最强大的Claude模型，适合复杂推理',
        maxTokens: 200000,
        temperature: { min: 0, max: 1, default: 0.5 },
        pricing: { input: 0.015, output: 0.075 },
        capabilities: ['text-generation', 'analysis', 'creative-writing', 'long-context'],
        recommended: true
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: '平衡性能和成本',
        maxTokens: 200000,
        temperature: { min: 0, max: 1, default: 0.5 },
        pricing: { input: 0.003, output: 0.015 },
        capabilities: ['text-generation', 'analysis', 'creative-writing', 'long-context'],
        recommended: false
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: '快速响应，适合简单任务',
        maxTokens: 200000,
        temperature: { min: 0, max: 1, default: 0.5 },
        pricing: { input: 0.00025, output: 0.00125 },
        capabilities: ['text-generation', 'analysis'],
        recommended: false
      }
    ]
  },

  google: {
    id: 'google',
    name: 'Google',
    description: 'Gemini系列模型，多模态能力',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    requestFormat: 'gemini',
    responseFormat: 'gemini',
    models: [
      {
        id: 'gemini-1.5-pro-latest',
        name: 'Gemini 1.5 Pro',
        description: '强大的多模态模型',
        maxTokens: 1048576,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.0035, output: 0.0105 },
        capabilities: ['text-generation', 'analysis', 'multimodal', 'long-context'],
        recommended: true
      },
      {
        id: 'gemini-1.5-flash-latest',
        name: 'Gemini 1.5 Flash',
        description: '快速且高效',
        maxTokens: 1048576,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.00035, output: 0.00105 },
        capabilities: ['text-generation', 'analysis', 'multimodal'],
        recommended: false
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: '标准性能模型',
        maxTokens: 32768,
        temperature: { min: 0, max: 1, default: 0.5 },
        pricing: { input: 0.0005, output: 0.0015 },
        capabilities: ['text-generation', 'analysis'],
        recommended: false
      }
    ]
  },

  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    description: '国内AI模型，中文优化',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKeyEnv: 'MINIMAX_API_KEY',
    requestFormat: 'openai',
    responseFormat: 'openai',
    models: [
      {
        id: 'abab6.5s-chat',
        name: 'MiniMax abab6.5s',
        description: '中文优化模型',
        maxTokens: 8192,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.001, output: 0.002 },
        capabilities: ['text-generation', 'chinese-optimized'],
        recommended: true
      },
      {
        id: 'abab6-chat',
        name: 'MiniMax abab6',
        description: '标准中文模型',
        maxTokens: 8192,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.0008, output: 0.0016 },
        capabilities: ['text-generation', 'chinese-optimized'],
        recommended: false
      }
    ]
  },

  moonshot: {
    id: 'moonshot',
    name: 'Moonshot',
    description: '月之暗面，长文本专家',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    requestFormat: 'openai',
    responseFormat: 'openai',
    models: [
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot 128K',
        description: '超长上下文窗口',
        maxTokens: 128000,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.006, output: 0.012 },
        capabilities: ['text-generation', 'long-context', 'chinese-optimized'],
        recommended: true
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot 32K',
        description: '长文本处理',
        maxTokens: 32768,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.003, output: 0.006 },
        capabilities: ['text-generation', 'long-context', 'chinese-optimized'],
        recommended: false
      },
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot 8K',
        description: '标准模型',
        maxTokens: 8192,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.001, output: 0.002 },
        capabilities: ['text-generation', 'chinese-optimized'],
        recommended: false
      }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索，代码和推理专家',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    requestFormat: 'openai',
    responseFormat: 'openai',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: '通用对话模型',
        maxTokens: 32768,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.001, output: 0.002 },
        capabilities: ['text-generation', 'code', 'analysis'],
        recommended: true
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        description: '代码专家',
        maxTokens: 16384,
        temperature: { min: 0, max: 2, default: 0.3 },
        pricing: { input: 0.001, output: 0.002 },
        capabilities: ['code', 'text-generation'],
        recommended: false
      }
    ]
  },

  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Azure托管的OpenAI服务',
    baseUrl: 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}',
    apiKeyEnv: 'AZURE_OPENAI_API_KEY',
    requestFormat: 'openai',
    responseFormat: 'openai',
    models: [
      {
        id: 'gpt-4',
        name: 'Azure GPT-4',
        description: '企业级GPT-4',
        maxTokens: 8192,
        temperature: { min: 0, max: 2, default: 0.5 },
        pricing: { input: 0.03, output: 0.06 },
        capabilities: ['text-generation', 'code', 'analysis', 'creative-writing'],
        recommended: true
      },
      {
        id: 'gpt-35-turbo',
        name: 'Azure GPT-3.5 Turbo',
        description: '企业级GPT-3.5',
        maxTokens: 4096,
        temperature: { min: 0, max: 2, default: 0.7 },
        pricing: { input: 0.0015, output: 0.002 },
        capabilities: ['text-generation', 'code', 'analysis'],
        recommended: false
      }
    ]
  }
};

// 获取所有可用的模型
export function getAllAvailableModels(): Array<{
  providerId: string;
  providerName: string;
  model: ModelConfig;
}> {
  const models: Array<{
    providerId: string;
    providerName: string;
    model: ModelConfig;
  }> = [];

  for (const [providerId, provider] of Object.entries(MODEL_PROVIDERS)) {
    for (const model of provider.models) {
      models.push({
        providerId,
        providerName: provider.name,
        model
      });
    }
  }

  return models;
}

// 获取推荐的模型
export function getRecommendedModels(): Array<{
  providerId: string;
  providerName: string;
  model: ModelConfig;
}> {
  return getAllAvailableModels().filter(item => item.model.recommended);
}

// 根据能力筛选模型
export function getModelsByCapability(capability: string): Array<{
  providerId: string;
  providerName: string;
  model: ModelConfig;
}> {
  return getAllAvailableModels().filter(item => 
    item.model.capabilities.includes(capability)
  );
}

// 获取模型提供商
export function getModelProvider(providerId: string): ModelProvider | undefined {
  return MODEL_PROVIDERS[providerId];
}

// 获取特定模型配置
export function getModelConfig(providerId: string, modelId: string): {
  provider: ModelProvider;
  model: ModelConfig;
} | undefined {
  const provider = MODEL_PROVIDERS[providerId];
  if (!provider) return undefined;

  const model = provider.models.find(m => m.id === modelId);
  if (!model) return undefined;

  return { provider, model };
}

// 构建请求URL
export function buildRequestUrl(provider: ModelProvider, modelId: string): string {
  switch (provider.requestFormat) {
    case 'openai':
      return `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
    case 'gemini':
      return `${provider.baseUrl.replace(/\/$/, '')}/models/${modelId}:generateContent`;
    case 'anthropic':
      return `${provider.baseUrl.replace(/\/$/, '')}/messages`;
    case 'custom':
      return provider.baseUrl;
    default:
      return provider.baseUrl;
  }
}

// 构建请求体
export function buildRequestBody(
  provider: ModelProvider,
  model: ModelConfig,
  messages: Array<{ role: string; content: string }>,
  temperature?: number
): Record<string, any> {
  const temp = temperature ?? model.temperature.default;

  switch (provider.requestFormat) {
    case 'openai':
      return {
        model: model.id,
        messages,
        temperature: temp,
        max_tokens: model.maxTokens
      };

    case 'gemini':
      return {
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: temp,
          maxOutputTokens: model.maxTokens
        }
      };

    case 'anthropic':
      return {
        model: model.id,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: temp,
        max_tokens: model.maxTokens
      };

    case 'custom':
    default:
      return {
        model: model.id,
        messages,
        temperature: temp
      };
  }
}

// 解析响应
export function parseResponse(
  provider: ModelProvider,
  response: any
): { content: string; usage?: { input: number; output: number } } {
  switch (provider.responseFormat) {
    case 'openai':
      return {
        content: response.choices?.[0]?.message?.content || '',
        usage: response.usage ? {
          input: response.usage.prompt_tokens || 0,
          output: response.usage.completion_tokens || 0
        } : undefined
      };

    case 'gemini':
      return {
        content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: response.usageMetadata ? {
          input: response.usageMetadata.promptTokenCount || 0,
          output: response.usageMetadata.candidatesTokenCount || 0
        } : undefined
      };

    case 'anthropic':
      return {
        content: response.content?.[0]?.text || '',
        usage: response.usage ? {
          input: response.usage.input_tokens || 0,
          output: response.usage.output_tokens || 0
        } : undefined
      };

    case 'custom':
    default:
      return {
        content: response.text || response.content || JSON.stringify(response),
        usage: response.usage
      };
  }
}

// 估算token数量（简单估算）
export function estimateTokens(text: string): number {
  // 粗略估算：英文约4字符/token，中文约1.5字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// 计算成本
export function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1000) * model.pricing.input;
  const outputCost = (outputTokens / 1000) * model.pricing.output;
  return inputCost + outputCost;
}
