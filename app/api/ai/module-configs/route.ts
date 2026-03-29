import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';
import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { addAuditLog } from '@/lib/server/admin-governance';
import { getSystemDefaultModelCards } from '@/lib/ai-status';
import { SYSTEM_PROVIDER_MODEL_IDS } from '@/lib/ai/ai-client';

interface AiModuleConfig {
  id?: number;
  moduleKey: string;
  moduleName?: string;
  modelId?: number | null;
  useAutomatic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 定义AI功能模块
const AI_MODULES = [
  { key: 'direction', name: '研究方向生成', description: '为用户提供研究方向建议', systemPreset: 'Gemini 优先' },
  { key: 'topic_analysis', name: '主题分析', description: '分析和拆解研究主题', systemPreset: 'Gemini 优先' },
  { key: 'content_generation', name: '内容生成', description: '生成章节和正文内容', systemPreset: 'MiniMax 优先' },
  { key: 'review', name: '稿件评审', description: '对稿件进行质量评估和改进建议', systemPreset: 'Gemini 优先' },
  { key: 'revision', name: '改稿建议', description: '提供具体的修改建议', systemPreset: 'MiniMax 优先' },
  { key: 'paper_guidance', name: '论文指导', description: '提供论文写作指导', systemPreset: 'Gemini 优先' },
  { key: 'think', name: 'AI思考', description: '深度思考和任务编排', systemPreset: 'Gemini 优先' }
];

export async function GET(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get('X-User-Type');
    const userId = authResponse.headers.get('X-User-Id') || undefined;
    if (!userType || !checkPermission(userType, 'ai:read', false, userId)) {
      return NextResponse.json(
        { ok: false, error: '没有权限查看模块配置。' },
        { status: 403 }
      );
    }

    const db = await getDatabase();
    const configs = await db.all('SELECT * FROM ai_module_configs');
    const models = await db.all('SELECT * FROM ai_models');
    const systemModels = getSystemDefaultModelCards();
    
    // 合并默认模块和已有配置
    const result = AI_MODULES.map(module => {
      const existingConfig = (configs as AiModuleConfig[]).find(c => c.moduleKey === module.key);
      return {
        ...module,
        ...existingConfig,
        useAutomatic: existingConfig?.useAutomatic ?? true,
        modelId: existingConfig?.modelId ?? null
      };
    });

    return NextResponse.json({
      ok: true,
      modules: result,
      models,
      systemModels,
      modelSwitchOptions: [
        { key: 'system', label: '跟随系统预置', modelId: null, useAutomatic: true },
        { key: 'gemini', label: '固定走 Gemini', modelId: SYSTEM_PROVIDER_MODEL_IDS.google, useAutomatic: false },
        { key: 'minimax', label: '固定走 MiniMax', modelId: SYSTEM_PROVIDER_MODEL_IDS.minimax, useAutomatic: false },
        { key: 'custom', label: '固定走自定义模型', modelId: null, useAutomatic: false }
      ]
    });
  } catch (error) {
    console.error('Failed to fetch module configs:', error);
    return NextResponse.json(
      { ok: false, error: '获取模块配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get('X-User-Type');
    const userId = authResponse.headers.get('X-User-Id') || undefined;
    if (!userType || !checkPermission(userType, 'ai:update', false, userId)) {
      return NextResponse.json(
        { ok: false, error: '没有权限更新模块配置。' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { moduleKey, modelId, useAutomatic } = body;

    if (!moduleKey) {
      return NextResponse.json(
        { ok: false, error: '缺少模块标识' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.run(
      'UPDATE ai_module_configs SET modelId = ?, useAutomatic = ?, updatedAt = ? WHERE moduleKey = ?',
      [modelId, useAutomatic ? 1 : 0, now, moduleKey]
    );

    // 如果没有更新到记录，说明需要插入新记录
    const existing = await db.get('SELECT * FROM ai_module_configs WHERE moduleKey = ?', [moduleKey]);
    if (!existing) {
      const moduleInfo = AI_MODULES.find(m => m.key === moduleKey);
      await db.run(
        'INSERT INTO ai_module_configs (id, moduleKey, moduleName, modelId, useAutomatic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [null, moduleKey, moduleInfo?.name || moduleKey, modelId, useAutomatic ? 1 : 0, now, now]
      );
    }

    addAuditLog({
      action: '更新 AI 模块分配',
      category: 'AI',
      severity: '提示',
      actor: 'super_admin',
      target: moduleKey,
      detail: `${moduleKey} 已切换为${useAutomatic ? '跟随系统预置' : modelId === SYSTEM_PROVIDER_MODEL_IDS.google ? '固定 Gemini' : modelId === SYSTEM_PROVIDER_MODEL_IDS.minimax ? '固定 MiniMax' : `固定自定义模型 ${modelId ?? '未指定'}`}。`
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update module config:', error);
    return NextResponse.json(
      { ok: false, error: '更新模块配置失败' },
      { status: 500 }
    );
  }
}
