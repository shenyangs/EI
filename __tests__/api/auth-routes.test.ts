/** @jest-environment node */

import bcrypt from 'bcrypt';
import { NextRequest } from 'next/server';

import { memoryStore } from '@/lib/server/db';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { GET as meGet, PUT as mePut } from '@/app/api/auth/me/route';
import { PUT as passwordPut } from '@/app/api/auth/password/route';
import { POST as registerPost } from '@/app/api/auth/register/route';

function createJsonRequest(url: string, method: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

describe('Auth Routes', () => {
  beforeEach(() => {
    memoryStore.users = [];
  });

  it('should register a user successfully', async () => {
    const request = createJsonRequest('http://localhost:3000/api/auth/register', 'POST', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      fullName: '测试用户',
      userType: 'student',
      institution: '测试大学',
      department: '服装设计'
    });

    const response = await registerPost(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.message).toBe('注册成功');
    expect(memoryStore.users).toHaveLength(1);
    expect(memoryStore.users[0].password).not.toBe('Password123');
  });

  it('should complete login to profile retrieval flow', async () => {
    const password = await bcrypt.hash('Password123', 10);
    memoryStore.users.push({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      password,
      fullName: '测试用户',
      userType: 'student',
      institution: '测试大学',
      department: '服装设计',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const loginResponse = await loginPost(
      createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'Password123'
      })
    );
    const loginPayload = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.token).toBeTruthy();

    const meResponse = await meGet(
      createJsonRequest('http://localhost:3000/api/auth/me', 'GET', undefined, {
        Authorization: `Bearer ${loginPayload.token}`
      })
    );
    const mePayload = await meResponse.json();

    expect(meResponse.status).toBe(200);
    expect(mePayload.user.email).toBe('test@example.com');
  });

  it('should update profile and password for authenticated user', async () => {
    const originalPassword = await bcrypt.hash('OldPassword123', 10);
    memoryStore.users.push({
      id: 'user-2',
      username: 'author',
      email: 'author@example.com',
      password: originalPassword,
      fullName: '作者',
      userType: 'student',
      institution: '初始学校',
      department: '初始院系',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const loginResponse = await loginPost(
      createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: 'author@example.com',
        password: 'OldPassword123'
      })
    );
    const { token } = await loginResponse.json();

    const profileResponse = await mePut(
      createJsonRequest(
        'http://localhost:3000/api/auth/me',
        'PUT',
        {
          fullName: '新作者',
          institution: '更新后的学校'
        },
        { Authorization: `Bearer ${token}` }
      )
    );
    const profilePayload = await profileResponse.json();

    expect(profileResponse.status).toBe(200);
    expect(profilePayload.user.fullName).toBe('新作者');
    expect(profilePayload.user.institution).toBe('更新后的学校');

    const passwordResponse = await passwordPut(
      createJsonRequest(
        'http://localhost:3000/api/auth/password',
        'PUT',
        {
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword123'
        },
        { Authorization: `Bearer ${token}` }
      )
    );
    const passwordPayload = await passwordResponse.json();

    expect(passwordResponse.status).toBe(200);
    expect(passwordPayload.message).toBe('密码修改成功');

    const reloginResponse = await loginPost(
      createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: 'author@example.com',
        password: 'NewPassword123'
      })
    );

    expect(reloginResponse.status).toBe(200);
  });
});
