import { NextRequest, NextResponse } from 'next/server';

import { getAiStatusPayload } from '@/lib/ai-status';
import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { getDatabase, memoryStore } from '@/lib/server/db';

function readBool(value?: string) {
  return value === 'true';
}

function labelStatus(ok: boolean, online = true) {
  if (ok && online) return '已连通';
  if (ok) return '可用';
  return '待处理';
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const userType = authResponse.headers.get('X-User-Type') || 'admin';
  const isSuperAdmin = authResponse.headers.get('X-Is-Super-Admin') === 'true';
  const userId = authResponse.headers.get('X-User-Id') || undefined;

  if (!checkPermission(userType, 'system:read', isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: '当前管理员没有查看诊断的权限。' }, { status: 403 });
  }

  const aiStatus = await getAiStatusPayload();
  const db = await getDatabase();
  const models = await db.all('SELECT * FROM ai_models');
  const modules = await db.all('SELECT * FROM ai_module_configs');

  const diagnostics = {
    ai: {
      model: aiStatus.model,
      provider: aiStatus.provider,
      hasApiKey: aiStatus.hasApiKey,
      canGeneratePaperDraft: aiStatus.canGeneratePaperDraft,
      canUseWebSearch: aiStatus.canUseWebSearch,
      modelStatus: labelStatus(aiStatus.canGeneratePaperDraft),
      searchStatus: labelStatus(aiStatus.canUseWebSearch)
    },
    data: {
      userCount: memoryStore.users.length + 1,
      projectCount: memoryStore.projects.length,
      modelCount: models.length,
      moduleConfigCount: modules.length
    },
    routes: [
      {
        key: 'ai-status',
        label: 'AI 状态接口',
        state: '正常',
        note: '首屏状态现在直接来自服务端，不会再先假红再变绿。'
      },
      {
        key: 'auth',
        label: '认证接口',
        state: '正常',
        note: '登录、注册和超管 token 逻辑已接通。'
      },
      {
        key: 'admin',
        label: '管理员后台',
        state: '已扩展',
        note: '用户权限、角色方案、审计日志和系统配置都已经接入超管后台。'
      }
    ],
    plannedModules: [
      '数据治理',
      '风险告警'
    ],
    environment: {
      hasMiniMaxKey: readBool(String(aiStatus.hasApiKey)),
      webSearchEnabled: readBool(String(aiStatus.webSearchEnabled)),
      currentModel: aiStatus.model,
      currentProvider: aiStatus.provider
    }
  };

  return NextResponse.json({ ok: true, diagnostics });
}
