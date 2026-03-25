import { orchestrateAIRequest, generateDirection, reviewContent, generateContent } from '@/lib/ai/ai-orchestrator';

// 模拟AI客户端
jest.mock('@/lib/ai/ai-client', () => ({
  getDefaultModel: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Default Model',
    provider: 'default'
  }),
  getModelById: jest.fn().mockResolvedValue(null),
  generatePaperDraft: jest.fn().mockResolvedValue({
    content: 'Test content',
    usage: { tokens: 100 }
  }),
  probeModelConnection: jest.fn().mockResolvedValue(true)
}));

// 模拟数据库
jest.mock('@/lib/server/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    all: jest.fn().mockResolvedValue([])
  })
}));

describe('AI Orchestrator', () => {
  describe('orchestrateAIRequest', () => {
    it('should orchestrate AI request with default model when no preferred model found', async () => {
      const result = await orchestrateAIRequest({
        taskType: 'content',
        prompt: 'Test prompt'
      });

      expect(result.content).toBe('Test content');
      expect(result.model.name).toBe('Default Model');
    });
  });

  describe('generateDirection', () => {
    it('should generate research directions for a topic', async () => {
      const result = await generateDirection('智能服饰设计');
      expect(result.content).toBe('Test content');
    });
  });

  describe('reviewContent', () => {
    it('should review content and provide feedback', async () => {
      const result = await reviewContent('Test content for review');
      expect(result.content).toBe('Test content');
    });
  });

  describe('generateContent', () => {
    it('should generate content based on prompt', async () => {
      const result = await generateContent('Generate test content');
      expect(result.content).toBe('Test content');
    });
  });
});
