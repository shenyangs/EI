import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';
import { authMiddleware, checkPermission } from '@/lib/server/auth-middleware';

export async function GET(request: NextRequest) {
  // 验证用户认证
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // 检查用户权限
  const userType = authResponse.headers.get('X-User-Type');
  if (!userType || !checkPermission(userType, 'ai:read')) {
    return NextResponse.json(
      { ok: false, error: '没有权限查看AI模型。' },
      { status: 403 }
    );
  }

  try {
    const db = await getDatabase();
    const models = await db.all('SELECT * FROM ai_models');
    
    return NextResponse.json({
      ok: true,
      models
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 验证用户认证
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // 检查用户权限
  const userType = authResponse.headers.get('X-User-Type');
  if (!userType || !checkPermission(userType, 'ai:create')) {
    return NextResponse.json(
      { ok: false, error: '没有权限创建AI模型。' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const { name, provider, model, baseUrl, apiKey, isDefault } = data;
    
    if (!name || !provider || !model || !baseUrl || !apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // 如果设置为默认，先将其他模型设置为非默认
    if (isDefault) {
      const models = await db.all('SELECT * FROM ai_models');
      for (const m of models) {
        if (m.isDefault) {
          await db.run('UPDATE ai_models SET isDefault = 0 WHERE id = ?', [m.id]);
        }
      }
    }
    
    const createdAt = new Date().toISOString();
    await db.run(
      'INSERT INTO ai_models (name, provider, model, baseUrl, apiKey, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, provider, model, baseUrl, apiKey, isDefault ? 1 : 0, createdAt]
    );
    
    const models = await db.all('SELECT * FROM ai_models');
    
    return NextResponse.json({
      ok: true,
      models
    });
  } catch (error) {
    console.error('Failed to create model:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create model' },
      { status: 500 }
    );
  }
}
