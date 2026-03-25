import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';

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
  { key: 'direction', name: '研究方向生成', description: '为用户提供研究方向建议' },
  { key: 'topic_analysis', name: '主题分析', description: '分析和拆解研究主题' },
  { key: 'content_generation', name: '内容生成', description: '生成章节和正文内容' },
  { key: 'review', name: '稿件评审', description: '对稿件进行质量评估和改进建议' },
  { key: 'revision', name: '改稿建议', description: '提供具体的修改建议' },
  { key: 'paper_guidance', name: '论文指导', description: '提供论文写作指导' },
  { key: 'think', name: 'AI思考', description: '深度思考和任务编排' }
];

export async function GET() {
  try {
    const db = await getDatabase();
    const configs = await db.all('SELECT * FROM ai_module_configs');
    const models = await db.all('SELECT * FROM ai_models');
    
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
      models
    });
  } catch (error) {
    console.error('Failed to fetch module configs:', error);
    return NextResponse.json(
      { ok: false, error: '获取模块配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update module config:', error);
    return NextResponse.json(
      { ok: false, error: '更新模块配置失败' },
      { status: 500 }
    );
  }
}
