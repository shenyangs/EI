import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { logger } from './logger';

// 密码加密 - 使用更高强度
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 14; // 增加强度
  return bcrypt.hash(password, saltRounds);
}

// 密码验证
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 输入验证 - 增强版
export function validateInput(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
    .replace(/javascript:[^\s]*/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// 安全的CORS配置
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://localhost:3000'
];

export function applyCorsHeaders(response: NextResponse, request: Pick<NextRequest, 'headers'>) {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  return response;
}

export function corsMiddleware(request: NextRequest) {
  return applyCorsHeaders(NextResponse.next(), request);
}

// 安全Headers中间件
export function securityHeadersMiddleware(request: NextRequest) {
  return applySecurityHeaders(NextResponse.next());
}

function isPrivateNetworkHost(hostname: string) {
  if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local')) {
    return true;
  }

  if (/^127\.\d+\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  const private172Match = hostname.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

// HTTPS重定向中间件 - 增强版
export function httpsRedirectMiddleware(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host');
  const hostname = request.nextUrl.hostname;
  const isLocalhost = isPrivateNetworkHost(hostname);
  
  // 检查是否需要HTTPS重定向
  if (process.env.NODE_ENV === 'production' && proto !== 'https' && !isLocalhost) {
    // 检查是否是健康检查端点（允许HTTP）
    if (request.nextUrl.pathname === '/api/monitoring/health') {
      return NextResponse.next();
    }
    
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.port = '';
    
    // 记录重定向
    logger.info('HTTPS redirect', {
      from: `http://${host}${request.nextUrl.pathname}`,
      to: url.toString()
    });
    
    return NextResponse.redirect(url, 301); // 使用301永久重定向
  }
  
  return NextResponse.next();
}

// 增强的速率限制中间件
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 60,
  skipSuccessfulRequests: false
};

// 不同端点的速率限制配置
const endpointConfigs: Map<string, RateLimitConfig> = new Map([
  ['/api/auth/login', { windowMs: 15 * 60 * 1000, maxRequests: 5 }], // 登录：15分钟5次
  ['/api/auth/register', { windowMs: 60 * 60 * 1000, maxRequests: 3 }], // 注册：1小时3次
  ['/api/ai/generate', { windowMs: 60 * 1000, maxRequests: 10 }], // AI生成：1分钟10次
]);

class RateLimiter {
  private requests = new Map<string, Array<number>>();
  
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // 获取该key的请求历史
    let timestamps = this.requests.get(key) || [];
    
    // 清理过期请求
    timestamps = timestamps.filter(time => time > windowStart);
    
    // 检查是否超过限制
    if (timestamps.length >= config.maxRequests) {
      this.requests.set(key, timestamps);
      return false;
    }
    
    // 记录新请求
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return true;
  }
  
  getRetryAfter(key: string, config: RateLimitConfig): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;
    
    const oldestRequest = Math.min(...timestamps);
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - Date.now()) / 1000);
    return Math.max(0, retryAfter);
  }
}

const rateLimiter = new RateLimiter();

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  const endpoint = request.nextUrl.pathname;
  const method = request.method;
  
  // 获取该端点的配置或使用默认配置
  const config = endpointConfigs.get(endpoint) || defaultConfig;
  
  // 生成唯一的限制key
  const limitKey = `${ip}:${endpoint}:${method}`;
  
  // 检查是否允许请求
  if (!rateLimiter.isAllowed(limitKey, config)) {
    const retryAfter = rateLimiter.getRetryAfter(limitKey, config);
    
    logger.warn('Rate limit exceeded', {
      ip,
      endpoint,
      method,
      retryAfter
    });
    
    return NextResponse.json(
      {
        error: '请求过于频繁',
        message: '请稍后再试',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + config.windowMs)
        }
      }
    );
  }
  
  return NextResponse.next();
}

// CSRF保护中间件
export function csrfMiddleware(request: NextRequest) {
  // 对于非修改请求，跳过CSRF检查
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return NextResponse.next();
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // 检查 Origin 头
  if (!origin) {
    logger.warn('CSRF check failed: Missing origin header', {
      path: request.nextUrl.pathname,
      method: request.method
    });
    
    return NextResponse.json(
      { error: '安全验证失败' },
      { status: 403 }
    );
  }
  
  // 验证 Origin 是否在允许列表中
  if (!ALLOWED_ORIGINS.includes(origin)) {
    logger.warn('CSRF check failed: Invalid origin', {
      origin,
      path: request.nextUrl.pathname
    });
    
    return NextResponse.json(
      { error: '安全验证失败' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}

// 请求大小限制中间件
export function requestSizeMiddleware(maxSize: number = 10 * 1024 * 1024) { // 默认10MB
  return (request: NextRequest) => {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Request size exceeded limit', {
        size: contentLength,
        limit: maxSize,
        path: request.nextUrl.pathname
      });
      
      return NextResponse.json(
        { error: '请求内容过大' },
        { status: 413 }
      );
    }
    
    return NextResponse.next();
  };
}

// 组合所有安全中间件
export function applySecurityMiddleware(request: NextRequest) {
  const blockingMiddlewares = [
    () => httpsRedirectMiddleware(request),
    () => rateLimitMiddleware(request),
    () => csrfMiddleware(request),
    () => requestSizeMiddleware()(request)
  ];

  for (const middleware of blockingMiddlewares) {
    const result = middleware();
    if (result.status !== 200) {
      return applyCorsHeaders(applySecurityHeaders(result), request);
    }
  }

  return applyCorsHeaders(applySecurityHeaders(NextResponse.next()), request);
}
