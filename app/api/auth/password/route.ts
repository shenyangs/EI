import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/server/db';
import { validateToken } from '@/lib/jwt';
import bcrypt from 'bcrypt';

// 密码加密
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// 验证密码
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
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

    // 验证旧密码
    const isOldPasswordValid = await verifyPassword(data.oldPassword, user.password);
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 400 });
    }

    // 验证新密码长度
    if (!data.newPassword || data.newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
    }

    // 加密新密码
    const hashedNewPassword = await hashPassword(data.newPassword);

    // 更新密码
    const updatedUser = {
      ...user,
      password: hashedNewPassword,
      updatedAt: new Date().toISOString()
    };

    memoryStore.users[userIndex] = updatedUser;

    return NextResponse.json({ message: '密码修改成功' }, { status: 200 });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
