import { generateContent, generateDirection, orchestrateAIRequest, reviewContent } from '@/lib/ai/ai-orchestrator';

const mockGetDefaultModel = jest.fn();
const mockGetModelById = jest.fn();
const mockGetModelByProvider = jest.fn();
const mockGeneratePaperDraft = jest.fn();
const mockProbeModelConnection = jest.fn();

jest.mock('@/lib/ai/ai-client', () => ({
  getDefaultModel: (...args: unknown[]) => mockGetDefaultModel(...args),
  getModelById: (...args: unknown[]) => mockGetModelById(...args),
  getModelByProvider: (...args: unknown[]) => mockGetModelByProvider(...args),
  generatePaperDraft: (...args: unknown[]) => mockGeneratePaperDraft(...args),
  probeModelConnection: (...args: unknown[]) => mockProbeModelConnection(...args)
}));

jest.mock('@/lib/server/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(null),
    all: jest.fn().mockResolvedValue([])
  })
}));

describe('AI Orchestrator', () => {
  beforeEach(() => {
    mockGetDefaultModel.mockReset();
    mockGetModelById.mockReset();
    mockGetModelByProvider.mockReset();
    mockGeneratePaperDraft.mockReset();
    mockProbeModelConnection.mockReset();

    mockGetDefaultModel.mockResolvedValue({
      id: 1,
      name: 'Default Model',
      provider: 'default'
    });
    mockGetModelById.mockResolvedValue(null);
    mockGetModelByProvider.mockResolvedValue(null);
    mockGeneratePaperDraft.mockResolvedValue({
      content: 'Test content',
      usage: { tokens: 100 }
    });
    mockProbeModelConnection.mockResolvedValue(true);
  });

  describe('orchestrateAIRequest', () => {
    it('should fall back to default model when provider specific model is unavailable', async () => {
      const result = await orchestrateAIRequest({
        taskType: 'content',
        prompt: 'Test prompt'
      });

      expect(mockGetDefaultModel).toHaveBeenCalled();
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
