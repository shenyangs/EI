import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from './db';
import { validateToken } from '@/lib/jwt';
import { hasEffectivePermission } from './admin-governance';
import {
  applyCorsHeaders,
  applySecurityHeaders,
  rateLimitMiddleware,
  httpsRedirectMiddleware
} from './security';

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
    return applyCorsHeaders(applySecurityHeaders(httpsResponse), request);
  }

  // 应用速率限制
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse.status !== 200) {
    return applyCorsHeaders(applySecurityHeaders(rateLimitResponse), request);
  }

  return applyCorsHeaders(applySecurityHeaders(NextResponse.next()), request);
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
  if ('isSuperAdmin' in user) {
    response.headers.set('X-Is-Super-Admin', user.isSuperAdmin ? 'true' : 'false');
  }

  return applyCorsHeaders(applySecurityHeaders(response), request);
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
        return applyCorsHeaders(applySecurityHeaders(response), request);
      }
    }
  }

  return applyCorsHeaders(applySecurityHeaders(NextResponse.next()), request);
}

// 角色权限检查
export function checkPermission(
  userType: string,
  requiredPermission: string,
  isSuperAdmin = false,
  userId?: string
): boolean {
  return hasEffectivePermission(userId, userType, requiredPermission, isSuperAdmin);
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
    const userType = authResponse.headers.get('X-User-Type');
    const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
    
    if (!userType && !isSuperAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查权限
    const userId = authResponse.headers.get('X-User-Id') || undefined;

    if (!checkPermission(userType || 'admin', requiredPermission, isSuperAdmin, userId)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    return NextResponse.next();
  };
}
