// 全局错误处理系统
// 对标大厂标准：统一的错误响应、错误分类、错误恢复

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { ValidationError } from './validation';

// 错误类型枚举
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

// 应用错误基类
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 具体错误类
export class ValidationAppError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorType.VALIDATION_ERROR, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION_ERROR, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorType.AUTHORIZATION_ERROR, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorType.NOT_FOUND_ERROR, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.CONFLICT_ERROR, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', ErrorType.RATE_LIMIT_ERROR, 429, { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `External service error: ${service}`,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      502,
      { service, message }
    );
  }
}

// 统一的错误响应格式
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    stack?: string;
  };
}

// 生成请求ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 处理错误并返回统一响应
export function handleError(error: unknown, requestId: string): NextResponse {
  let appError: AppError;
  let statusCode = 500;

  if (error instanceof AppError) {
    appError = error;
    statusCode = error.statusCode;
  } else if (error instanceof ValidationError) {
    appError = new ValidationAppError(error.message, { fields: error.fields });
    statusCode = 400;
  } else if (error instanceof Error) {
    appError = new AppError(
      error.message,
      ErrorType.INTERNAL_ERROR,
      500
    );
  } else {
    appError = new AppError(
      'Unknown error occurred',
      ErrorType.INTERNAL_ERROR,
      500
    );
  }

  // 记录错误
  if (statusCode >= 500) {
    logger.error('Server error', error instanceof Error ? error : undefined, {
      requestId,
      type: appError.type,
      statusCode
    });
  } else {
    logger.warn('Client error', {
      requestId,
      type: appError.type,
      statusCode,
      message: appError.message
    });
  }

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: appError.type,
      message: appError.message,
      code: `${appError.type}_${statusCode}`,
      details: appError.details,
      timestamp: new Date().toISOString(),
      requestId,
      // 只在开发环境返回堆栈
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        stack: error.stack
      })
    }
  };

  const headers: Record<string, string> = {
    'X-Request-ID': requestId
  };

  // 添加速率限制头
  if (appError.type === ErrorType.RATE_LIMIT_ERROR && appError.details?.retryAfter) {
    headers['Retry-After'] = String(appError.details.retryAfter);
  }

  return NextResponse.json(errorResponse, { status: statusCode, headers });
}

// API路由包装器
export function withErrorHandler(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    
    try {
      // 添加请求ID到请求头
      const requestWithId = new Request(request.url, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'X-Request-ID': requestId
        },
        body: request.body
      });
      
      return await handler(requestWithId as NextRequest);
    } catch (error) {
      return handleError(error, requestId);
    }
  };
}


