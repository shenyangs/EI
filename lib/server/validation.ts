// 输入验证和净化系统
// 对标大厂标准：严格的输入验证、XSS防护、SQL注入防护

import { z } from 'zod';
import { logger } from './logger';

// 自定义验证错误
export class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 常用验证模式
export const ValidationSchemas = {
  // 用户相关
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),

  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

  // 项目相关
  projectId: z.string()
    .uuid('Invalid project ID format'),

  projectTitle: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform(val => sanitizeInput(val)),

  projectDescription: z.string()
    .max(2000, 'Description too long')
    .transform(val => sanitizeInput(val)),

  // AI相关
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(10000, 'Prompt too long')
    .transform(val => sanitizeInput(val)),

  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2'),

  modelId: z.number()
    .int('Model ID must be an integer')
    .positive('Model ID must be positive'),

  // 内容相关
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long')
    .transform(val => sanitizeInput(val)),

  keywords: z.array(z.string().max(50))
    .max(20, 'Too many keywords'),

  // ID相关
  id: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
    .max(64, 'ID too long'),

  // 分页相关
  page: z.number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),

  limit: z.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),

  // 搜索相关
  searchQuery: z.string()
    .max(200, 'Search query too long')
    .transform(val => sanitizeInput(val)),
};

// 输入净化函数
export function sanitizeInput(input: string): string {
  if (!input) return input;

  return input
    // 移除潜在的危险标签
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
    // 移除事件处理器
    .replace(/on\w+\s*=/gi, '')
    // 移除javascript协议
    .replace(/javascript:/gi, '')
    // 移除data URI
    .replace(/data:[^;]*;base64,/gi, '')
    // 转义HTML特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // 规范化空白字符
    .replace(/\s+/g, ' ')
    .trim();
}

// SQL注入检测
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|MERGE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /';\s*--/,
    /";\s*--/,
    /'\s*OR\s*'/i,
    /"\s*OR\s*"/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// XSS检测
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// 验证函数
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      logger.warn('Validation failed', { fields, data });
      
      throw new ValidationError('Input validation failed', fields);
    }
    throw error;
  }
}

// 安全验证函数（带SQL注入和XSS检测）
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: { checkSQLInjection?: boolean; checkXSS?: boolean } = {}
): T {
  const { checkSQLInjection = true, checkXSS = true } = options;

  // 先进行常规验证
  const validated = validate(schema, data);

  // 检查字符串字段
  if (typeof validated === 'object' && validated !== null) {
    for (const [key, value] of Object.entries(validated)) {
      if (typeof value === 'string') {
        if (checkSQLInjection && detectSQLInjection(value)) {
          logger.error(`SQL injection detected in field: ${key}`, undefined, { value });
          throw new ValidationError('Security validation failed', [
            { field: key, message: 'Potentially dangerous content detected' }
          ]);
        }

        if (checkXSS && detectXSS(value)) {
          logger.error(`XSS attempt detected in field: ${key}`, undefined, { value });
          throw new ValidationError('Security validation failed', [
            { field: key, message: 'Potentially dangerous content detected' }
          ]);
        }
      }
    }
  }

  return validated;
}

// API请求验证中间件
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (request: Request): Promise<T> => {
    let data: unknown;

    switch (source) {
      case 'body':
        data = await request.json();
        break;
      case 'query':
        const url = new URL(request.url);
        data = Object.fromEntries(url.searchParams);
        break;
      case 'params':
        // 从URL路径中提取参数
        const pathMatch = request.url.match(/\/([^/]+)$/);
        data = pathMatch ? { id: pathMatch[1] } : {};
        break;
    }

    return validateSafe(schema, data);
  };
}

// 常用验证组合
export const ProjectSchemas = {
  create: z.object({
    title: ValidationSchemas.projectTitle,
    description: ValidationSchemas.projectDescription.optional(),
    venueId: ValidationSchemas.id,
    keywords: ValidationSchemas.keywords.optional(),
  }),

  update: z.object({
    id: ValidationSchemas.projectId,
    title: ValidationSchemas.projectTitle.optional(),
    description: ValidationSchemas.projectDescription.optional(),
    keywords: ValidationSchemas.keywords.optional(),
  }),

  delete: z.object({
    id: ValidationSchemas.projectId,
  }),
};

export const UserSchemas = {
  register: z.object({
    username: ValidationSchemas.username,
    email: ValidationSchemas.email,
    password: ValidationSchemas.password,
    fullName: z.string().min(1).max(100).optional(),
  }),

  login: z.object({
    email: ValidationSchemas.email,
    password: z.string().min(1),
  }),

  update: z.object({
    fullName: z.string().min(1).max(100).optional(),
    institution: z.string().max(200).optional(),
    department: z.string().max(200).optional(),
  }),
};

export const AISchemas = {
  generate: z.object({
    prompt: ValidationSchemas.prompt,
    systemPrompt: ValidationSchemas.prompt.optional(),
    temperature: ValidationSchemas.temperature.optional(),
    modelId: ValidationSchemas.modelId.optional(),
  }),

  check: z.object({
    content: ValidationSchemas.content,
    checkType: z.enum(['grammar', 'plagiarism', 'quality']),
  }),
};

// 导出类型
export type ValidatedProjectCreate = z.infer<typeof ProjectSchemas.create>;
export type ValidatedUserRegister = z.infer<typeof UserSchemas.register>;
export type ValidatedAIGenerate = z.infer<typeof AISchemas.generate>;
