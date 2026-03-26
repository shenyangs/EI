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
    .email('邮箱格式不正确')
    .min(5, '邮箱地址过短')
    .max(254, '邮箱地址过长')
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(8, '密码长度至少 8 位')
    .max(128, '密码长度过长')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字')
    .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符'),

  username: z.string()
    .min(3, '用户名长度至少 3 位')
    .max(32, '用户名长度过长')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和连字符'),

  // 项目相关
  projectId: z.string()
    .uuid('项目 ID 格式不正确'),

  projectTitle: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题长度过长')
    .transform(val => sanitizeInput(val)),

  projectDescription: z.string()
    .max(2000, '描述长度过长')
    .transform(val => sanitizeInput(val)),

  // AI 相关
  prompt: z.string()
    .min(1, '提示内容不能为空')
    .max(10000, '提示内容过长')
    .transform(val => sanitizeInput(val)),

  temperature: z.number()
    .min(0, '温度值必须在 0 到 2 之间')
    .max(2, '温度值必须在 0 到 2 之间'),

  modelId: z.number()
    .int('模型 ID 必须为整数')
    .positive('模型 ID 必须为正数'),

  // 内容相关
  content: z.string()
    .min(1, '内容不能为空')
    .max(50000, '内容长度过长')
    .transform(val => sanitizeInput(val)),

  keywords: z.array(z.string().max(50))
    .max(20, '关键词数量过多'),

  // ID 相关
  id: z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID 格式不正确')
    .max(64, 'ID 长度过长'),

  // 分页相关
  page: z.number()
    .int()
    .min(1, '页码最小为 1')
    .default(1),

  limit: z.number()
    .int()
    .min(1, '每页数量最小为 1')
    .max(100, '每页数量不能超过 100')
    .default(20),

  // 搜索相关
  searchQuery: z.string()
    .max(200, '搜索内容过长')
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
