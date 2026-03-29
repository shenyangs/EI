import { NextRequest, NextResponse } from 'next/server';

import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { adminGovernanceStore } from '@/lib/server/admin-governance';

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const userType = authResponse.headers.get('X-User-Type') || 'admin';
  const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
  const userId = authResponse.headers.get('X-User-Id') || undefined;

  if (!checkPermission(userType, 'system:read', isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: '当前管理员没有查看审计日志的权限。' }, { status: 403 });
  }

  const logs = adminGovernanceStore.auditLogs;
  const summary = {
    total: logs.length,
    highRisk: logs.filter((log) => log.severity === '高风险').length,
    important: logs.filter((log) => log.severity === '重要').length,
    latest: logs[0]?.createdAt ?? null
  };

  return NextResponse.json({ ok: true, logs, summary });
}
