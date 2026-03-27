/** @jest-environment node */

import bcrypt from 'bcrypt';
import { NextRequest } from 'next/server';

import { memoryStore } from '@/lib/server/db';
import { generateToken } from '@/lib/jwt';
import { GET as listModels, POST as createModel } from '@/app/api/ai/models/route';
import { DELETE as deleteModel, PUT as updateModel } from '@/app/api/ai/models/[id]/route';

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

async function seedAdminUser() {
  const hashedPassword = await bcrypt.hash('Password123', 10);
  memoryStore.users.push({
    id: 'admin-1',
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword,
    fullName: '系统管理员',
    userType: 'admin',
    institution: '系统',
    department: '平台',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return generateToken('admin-1', 'admin@example.com');
}

describe('AI Model Routes', () => {
  beforeEach(() => {
    memoryStore.users = [];
    memoryStore.aiModels = [];
  });

  it('should create and list models for authorized users', async () => {
    const token = await seedAdminUser();

    const createResponse = await createModel(
      createJsonRequest(
        'http://localhost:3000/api/ai/models',
        'POST',
        {
          name: 'Gemini 2.5',
          provider: 'google',
          model: 'gemini-2.5-pro',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          apiKey: 'test-key',
          isDefault: true
        },
        { Authorization: `Bearer ${token}` }
      )
    );
    const createPayload = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createPayload.ok).toBe(true);
    expect(memoryStore.aiModels).toHaveLength(1);
    expect(memoryStore.aiModels[0]).toMatchObject({
      name: 'Gemini 2.5',
      provider: 'google',
      model: 'gemini-2.5-pro'
    });

    const listResponse = await listModels(
      createJsonRequest('http://localhost:3000/api/ai/models', 'GET', undefined, {
        Authorization: `Bearer ${token}`
      })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.models).toHaveLength(1);
    expect(listPayload.models[0].provider).toBe('google');
  });

  it('should reject unauthenticated update and delete requests', async () => {
    memoryStore.aiModels.push({
      id: 1,
      name: 'Minimax',
      provider: 'minimax',
      model: 'MiniMax-M2.7',
      baseUrl: 'https://api.minimax.test',
      apiKey: 'secret',
      isDefault: false,
      createdAt: new Date().toISOString()
    });

    const updateResponse = await updateModel(
      createJsonRequest('http://localhost:3000/api/ai/models/1', 'PUT', {
        name: 'Updated',
        provider: 'minimax',
        model: 'MiniMax-M2.7',
        baseUrl: 'https://api.minimax.test',
        apiKey: 'secret',
        isDefault: false
      }),
      { params: Promise.resolve({ id: '1' }) }
    );

    const deleteResponse = await deleteModel(
      createJsonRequest('http://localhost:3000/api/ai/models/1', 'DELETE'),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(updateResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });
});
