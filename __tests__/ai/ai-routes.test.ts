/** @jest-environment node */

const mockGenerateContent = jest.fn();
const mockOrchestrateAIRequest = jest.fn();
const mockGenerateRevisionSuggestions = jest.fn();

jest.mock('@/lib/ai/ai-orchestrator', () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
  orchestrateAIRequest: (...args: unknown[]) => mockOrchestrateAIRequest(...args),
  AiOrchestrator: {
    generateRevisionSuggestions: (...args: unknown[]) => mockGenerateRevisionSuggestions(...args)
  }
}));

import { POST as draftPost } from '@/app/api/ai/draft/route';
import { POST as thinkPost } from '@/app/api/ai/think/route';
import { POST as streamPost } from '@/app/api/ai/stream/route';

describe('AI routes', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockOrchestrateAIRequest.mockReset();
    mockGenerateRevisionSuggestions.mockReset();
  });

  it('draft route should return JSON payload for front-end consumers', async () => {
    mockGenerateContent.mockResolvedValue({
      content: '这是生成的草稿',
      usage: { totalTokens: 12 },
      model: { id: 1, name: 'Mock Model', provider: 'mock' },
      fallback: false
    });

    const response = await draftPost(
      new Request('http://localhost/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '请生成草稿' })
      })
    );

    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      content: '这是生成的草稿',
      fallback: false
    });
  });

  it('think route should return structured JSON for fill_field flow', async () => {
    mockOrchestrateAIRequest.mockResolvedValue({
      content: '智能服饰交互设计研究',
      usage: {},
      model: { id: 2, name: 'Mock Gemini', provider: 'google' },
      fallback: false
    });

    const response = await thinkPost(
      new Request('http://localhost/api/ai/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'fill_field',
          context: {
            field: 'title',
            projectId: 'new',
            projectTitle: '智能服饰',
            venueId: 'ieee-iccci-2026',
            currentStep: 'project_creation',
            previousSteps: [],
            userInputs: {
              title: '智能服饰'
            }
          }
        })
      })
    );

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.content.content).toBe('智能服饰交互设计研究');
    expect(data.content.sections.title).toBe('智能服饰交互设计研究');
  });

  it('think route should return fallback content for description fill when AI fails', async () => {
    mockOrchestrateAIRequest.mockRejectedValue(new Error('AI 服务响应超时，请稍后重试'));

    const response = await thinkPost(
      new Request('http://localhost/api/ai/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'fill_field',
          context: {
            field: 'description',
            projectId: 'new',
            projectTitle: '智能服饰交互设计',
            venueId: 'ieee-iccci-2026',
            currentStep: 'project_creation',
            previousSteps: [],
            userInputs: {
              title: '智能服饰交互设计',
              subject: '服装交互体验'
            }
          }
        })
      })
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.content.sections.description).toContain('智能服饰交互设计');
    expect(data.content.metadata.isFallback).toBe(true);
  });

  it('think route should fall back gracefully for project initialization analysis', async () => {
    mockOrchestrateAIRequest.mockRejectedValue(new Error('AI 服务响应超时，请稍后重试'));

    const response = await thinkPost(
      new Request('http://localhost/api/ai/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'project_initialization',
          context: {
            projectId: 'new',
            projectTitle: '智能服饰交互设计',
            venueId: 'ieee-iccci-2026',
            currentStep: 'project_creation',
            previousSteps: [],
            userInputs: {
              title: '智能服饰交互设计',
              description: '希望研究服装与交互技术的结合方式'
            }
          }
        })
      })
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.content.content).toContain('智能服饰交互设计');
    expect(Array.isArray(data.content.metadata.directions)).toBe(true);
    expect(data.content.metadata.directions.length).toBeGreaterThan(0);
  });

  it('stream route should support revision suggestion events', async () => {
    mockGenerateRevisionSuggestions.mockResolvedValue([
      {
        section: '引言',
        issue: '背景不足',
        suggestion: '补充研究背景与问题界定',
        severity: 'high'
      }
    ]);

    const response = await streamPost(
      new Request('http://localhost/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'revision_suggestions',
          context: {
            projectId: 'project-1',
            projectTitle: '测试论文',
            currentStep: 'revision',
            previousSteps: [],
            content: '测试内容',
            qualityReport: { overall: '建议修改' }
          }
        })
      })
    );

    const text = await new Response(response.body).text();

    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(text).toContain('"type":"revision"');
    expect(text).toContain('补充研究背景与问题界定');
    expect(text).toContain('data: [DONE]');
  });
});
