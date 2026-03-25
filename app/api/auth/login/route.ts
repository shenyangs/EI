import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/server/db';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/jwt';

// 验证密码
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码都是必填的' }, { status: 400 });
    }

    // 查找用户
    const user = memoryStore.users.find(u => u.email === email);
    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // 生成token
    const token = generateToken(user.id, user.email);

    // 返回用户信息和token
    return NextResponse.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        institution: user.institution,
        department: user.department
      }
    }, { status: 200 });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}