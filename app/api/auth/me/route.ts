import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/server/db';
import { validateToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenData = validateToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 });
    }

    // 查找用户
    const user = memoryStore.users.find(u => u.id === tokenData.userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 返回用户信息（不包含密码）
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        institution: user.institution,
        department: user.department,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenData = validateToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 });
    }

    // 查找用户
    const userIndex = memoryStore.users.findIndex(u => u.id === tokenData.userId);
    if (userIndex === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = memoryStore.users[userIndex];
    const data = await request.json();

    // 更新用户信息
    const updatedUser = {
      ...user,
      username: data.username || user.username,
      fullName: data.fullName || user.fullName,
      institution: data.institution || user.institution,
      department: data.department || user.department,
      updatedAt: new Date().toISOString()
    };

    memoryStore.users[userIndex] = updatedUser;

    // 返回更新后的用户信息
    return NextResponse.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        userType: updatedUser.userType,
        institution: updatedUser.institution,
        department: updatedUser.department,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json({ error: '更新用户信息失败' }, { status: 500 });
  }
}
