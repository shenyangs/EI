import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';
import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';
import { addAuditLog } from '@/lib/server/admin-governance';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get('X-User-Type');
    const userId = authResponse.headers.get('X-User-Id') || undefined;
    if (!userType || !checkPermission(userType, 'ai:update', false, userId)) {
      return NextResponse.json(
        { ok: false, error: '没有权限更新AI模型。' },
        { status: 403 }
      );
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid model id' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    const { name, provider, model, baseUrl, apiKey, isDefault } = data;
    
    if (!name || !provider || !model || !baseUrl || !apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 检查模型是否存在
    const existingModel = await db.get('SELECT * FROM ai_models WHERE id = ?', [id]);
    if (!existingModel) {
      return NextResponse.json(
        { ok: false, error: 'Model not found' },
        { status: 404 }
      );
    }
    
    // 如果设置为默认，先将其他模型设置为非默认
    if (isDefault) {
      const models = await db.all('SELECT * FROM ai_models');
      for (const m of models) {
        if (m.isDefault && m.id !== id) {
          await db.run('UPDATE ai_models SET isDefault = 0 WHERE id = ?', [m.id]);
        }
      }
    }
    
    await db.run(
      'UPDATE ai_models SET name = ?, provider = ?, model = ?, baseUrl = ?, apiKey = ?, isDefault = ? WHERE id = ?',
      [name, provider, model, baseUrl, apiKey, isDefault ? 1 : 0, id]
    );
    
    const models = await db.all('SELECT * FROM ai_models');

    addAuditLog({
      action: '更新 AI 模型',
      category: 'AI',
      severity: '提示',
      actor: 'super_admin',
      target: name,
      detail: `更新模型 ${name} 的连接配置与默认状态。`
    });
    
    return NextResponse.json({
      ok: true,
      models
    });
  } catch (error) {
    console.error('Failed to update model:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get('X-User-Type');
    const userId = authResponse.headers.get('X-User-Id') || undefined;
    if (!userType || !checkPermission(userType, 'ai:delete', false, userId)) {
      return NextResponse.json(
        { ok: false, error: '没有权限删除AI模型。' },
        { status: 403 }
      );
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid model id' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 检查模型是否存在
    const existingModel = await db.get('SELECT * FROM ai_models WHERE id = ?', [id]);
    if (!existingModel) {
      return NextResponse.json(
        { ok: false, error: 'Model not found' },
        { status: 404 }
      );
    }
    
    await db.run('DELETE FROM ai_models WHERE id = ?', [id]);
    
    const models = await db.all('SELECT * FROM ai_models');

    addAuditLog({
      action: '删除 AI 模型',
      category: 'AI',
      severity: '高风险',
      actor: 'super_admin',
      target: existingModel.name,
      detail: `删除模型 ${existingModel.name}。`
    });
    
    return NextResponse.json({
      ok: true,
      models
    });
  } catch (error) {
    console.error('Failed to delete model:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
