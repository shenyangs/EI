import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/server/db';
import bcrypt from 'bcrypt';

// 生成唯一ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 密码加密
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, fullName, userType, institution, department } = await request.json();

    // 验证必填字段
    if (!username || !email || !password || !fullName || !userType || !institution || !department) {
      return NextResponse.json({ error: '所有字段都是必填的' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    // 验证用户类型
    const validUserTypes = ['student', 'lecturer', 'associate_professor', 'professor', 'advisor', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return NextResponse.json({ error: '无效的用户类型' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = memoryStore.users.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json({ error: '邮箱已被注册' }, { status: 400 });
    }

    const now = new Date().toISOString();
  const hashedPassword = await hashPassword(password);

  // 创建用户
  const user = {
    id: generateId(),
    username,
    email,
    password: hashedPassword,
    fullName,
    userType,
    institution,
    department,
    createdAt: now,
    updatedAt: now
  };

    memoryStore.users.push(user);

    return NextResponse.json({ message: '注册成功' }, { status: 201 });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}