import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from './db';
import { validateToken } from '@/lib/jwt';
import { rateLimitMiddleware, httpsRedirectMiddleware, corsMiddleware } from './security';

// 超管信息
const SUPER_ADMIN = {
  id: 'super_admin_001',
  email: 'admin@system.com',
  username: 'super_admin',
  fullName: '超级管理员',
  userType: 'admin',
  institution: '系统管理',
  department: '管理部门',
  isSuperAdmin: true
};

// 组合中间件
export async function applyMiddlewares(request: NextRequest) {
  // 应用HTTPS重定向
  const httpsResponse = httpsRedirectMiddleware(request);
  if (httpsResponse.status !== 200) {
    return httpsResponse;
  }
  
  // 应用CORS
  const corsResponse = corsMiddleware(request);
  
  // 应用速率限制
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse.status !== 200) {
    return rateLimitResponse;
  }
  
  return NextResponse.next();
}

// 权限验证中间件
export async function authMiddleware(request: NextRequest) {
  // 应用基础中间件
  const middlewareResponse = await applyMiddlewares(request);
  if (middlewareResponse.status !== 200) {
    return middlewareResponse;
  }

  // 从请求头获取token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  
  // 检查是否是超管 token
  let user;
  if (token.startsWith('super_admin_token_')) {
    user = SUPER_ADMIN;
  } else {
    const tokenData = validateToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: '无效的 token' }, { status: 401 });
    }

    // 查找用户
    user = memoryStore.users.find(u => u.id === tokenData.userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
  }

  // 将用户信息添加到请求头，以便后续处理
  const response = NextResponse.next();
  response.headers.set('X-User-Id', user.id);
  response.headers.set('X-User-Type', user.userType);
  response.headers.set('X-Is-Super-Admin', user.isSuperAdmin ? 'true' : 'false');
  
  // 添加安全相关的响应头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

// 可选的认证中间件（用于不需要强制认证的路由）
export async function optionalAuthMiddleware(request: NextRequest) {
  // 应用基础中间件
  const middlewareResponse = await applyMiddlewares(request);
  if (middlewareResponse.status !== 200) {
    return middlewareResponse;
  }

  // 从请求头获取token
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenData = validateToken(token);
    if (tokenData) {
      // 查找用户
      const user = memoryStore.users.find(u => u.id === tokenData.userId);
      if (user) {
        // 将用户信息添加到请求头
        const response = NextResponse.next();
        response.headers.set('X-User-Id', user.id);
        response.headers.set('X-User-Type', user.userType);
        return response;
      }
    }
  }

  return NextResponse.next();
}

// 角色权限检查
export function checkPermission(userType: string, requiredPermission: string, isSuperAdmin = false): boolean {
  // 超管拥有所有权限
  if (isSuperAdmin) {
    return true;
  }
  
  // 权限映射表
  const permissions: Record<string, Record<string, boolean>> = {
    student: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': false,
      'project:share': false,
      'ai:create': false,
      'ai:read': true,
      'ai:update': false,
      'ai:delete': false,
      'user:create': false,
      'user:read': false,
      'user:update': false,
      'user:delete': false,
      'system:read': false,
      'system:update': false
    },
    lecturer: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': true,
      'project:share': true,
      'ai:create': true,
      'ai:read': true,
      'ai:update': true,
      'ai:delete': false,
      'user:create': false,
      'user:read': false,
      'user:update': false,
      'user:delete': false,
      'system:read': false,
      'system:update': false
    },
    associate_professor: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': true,
      'project:share': true,
      'ai:create': true,
      'ai:read': true,
      'ai:update': true,
      'ai:delete': true,
      'user:create': false,
      'user:read': false,
      'user:update': false,
      'user:delete': false,
      'system:read': false,
      'system:update': false
    },
    professor: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': true,
      'project:share': true,
      'ai:create': true,
      'ai:read': true,
      'ai:update': true,
      'ai:delete': true,
      'user:create': false,
      'user:read': true,
      'user:update': false,
      'user:delete': false,
      'system:read': false,
      'system:update': false
    },
    advisor: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': true,
      'project:share': true,
      'ai:create': true,
      'ai:read': true,
      'ai:update': true,
      'ai:delete': true,
      'user:create': true,
      'user:read': true,
      'user:update': true,
      'user:delete': false,
      'system:read': false,
      'system:update': false
    },
    admin: {
      'project:create': true,
      'project:read': true,
      'project:update': true,
      'project:delete': true,
      'project:share': true,
      'ai:create': true,
      'ai:read': true,
      'ai:update': true,
      'ai:delete': true,
      'user:create': true,
      'user:read': true,
      'user:update': true,
      'user:delete': true,
      'system:read': true,
      'system:update': true
    }
  };

  return permissions[userType]?.[requiredPermission] || false;
}

// 权限检查中间件
export function permissionMiddleware(requiredPermission: string) {
  return async (request: NextRequest) => {
    // 先通过认证中间件
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    // 获取用户类型和超管标识
    const userType = request.headers.get('X-User-Type');
    const isSuperAdmin = request.headers.get('X-Is-Super-Admin') === 'true';
    
    if (!userType && !isSuperAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查权限
    if (!checkPermission(userType || 'admin', requiredPermission, isSuperAdmin)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    return NextResponse.next();
  };
}