import { NextRequest, NextResponse } from 'next/server';

import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { addAuditLog, adminGovernanceStore, updateSystemConfig } from '@/lib/server/admin-governance';

function requirePermission(authResponse: NextResponse, permission: string) {
  const userType = authResponse.headers.get('X-User-Type') || 'admin';
  const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
  const userId = authResponse.headers.get('X-User-Id') || undefined;

  if (!checkPermission(userType, permission, isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: '当前管理员没有这项权限。' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requirePermission(authResponse, 'system:read');
  if (denied) {
    return denied;
  }

  return NextResponse.json({
    ok: true,
    config: adminGovernanceStore.systemConfig,
    notes: {
      immediate: ['后台审计日志', '公开注册入口', '联网搜索能力', 'AI 自动补全'],
      staged: ['默认论文题型', '默认会议规则']
    }
  });
}

export async function PATCH(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = requirePermission(authResponse, 'system:update');
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const config = updateSystemConfig(body);

  addAuditLog({
    action: '更新系统配置',
    category: '系统',
    severity: '重要',
    actor: 'super_admin',
    target: 'system-config',
    detail: '超级管理员更新了注册策略、题型默认项或功能开关。'
  });

  return NextResponse.json({ ok: true, config });
}
