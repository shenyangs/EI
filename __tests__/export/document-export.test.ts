import { exportDocument, downloadFile, batchExport, type ExportOptions } from '@/lib/export/document-export';

describe('Document Export', () => {
  const mockOptions: ExportOptions = {
    format: 'latex',
    projectTitle: '测试论文标题',
    abstract: '这是一个测试摘要',
    keywords: ['关键词1', '关键词2'],
    sections: [
      {
        id: 'section-1',
        title: '1. 绪论',
        content: ['这是第一段内容', '这是第二段内容']
      },
      {
        id: 'section-2',
        title: '2. 文献综述',
        content: ['文献综述内容']
      }
    ],
    venueProfile: {
      id: 'ieee-iccci-2026',
      name: 'IEEE ICCCI 2026',
      shortName: 'ICCCI',
      template: 'IEEE Conference Template',
      publisher: 'IEEE'
    }
  };

  describe('exportDocument', () => {
    it('should export LaTeX format successfully', async () => {
      const result = await exportDocument({ ...mockOptions, format: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.content).toContain('\\documentclass');
      expect(result.content).toContain('\\title{测试论文标题}');
      expect(result.content).toContain('\\begin{abstract}');
      expect(result.filename).toBe('测试论文标题.tex');
      expect(result.blob).toBeDefined();
    });

    it('should export DOCX format successfully', async () => {
      const result = await exportDocument({ ...mockOptions, format: 'docx' });
      
      expect(result.success).toBe(true);
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('测试论文标题');
      expect(result.content).toContain('关键词1');
      expect(result.filename).toBe('测试论文标题.html');
      expect(result.blob).toBeDefined();
    });

    it('should export PDF format successfully', async () => {
      const result = await exportDocument({ ...mockOptions, format: 'pdf' });
      
      expect(result.success).toBe(true);
      expect(result.content).toContain('@page');
      expect(result.content).toContain('摘 要');
      expect(result.blob).toBeDefined();
    });

    it('should handle unsupported format', async () => {
      const result = await exportDocument({ ...mockOptions, format: 'unsupported' as any });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('不支持的导出格式');
    });

    it('should handle special characters in title', async () => {
      const optionsWithSpecialChars = {
        ...mockOptions,
        projectTitle: '论文：测试/特殊\\字符',
        format: 'latex' as const
      };
      
      const result = await exportDocument(optionsWithSpecialChars);
      
      expect(result.success).toBe(true);
      expect(result.filename).toBe('论文_测试_特殊_字符.tex');
    });
  });

  describe('batchExport', () => {
    it('should export multiple documents', async () => {
      const options1 = { ...mockOptions, projectTitle: '论文1' };
      const options2 = { ...mockOptions, projectTitle: '论文2' };
      
      const results = await batchExport([options1, options2], 'latex');
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].filename).toBe('论文1.tex');
      expect(results[1].filename).toBe('论文2.tex');
    });

    it('should use the shared batch format for every document', async () => {
      const validOptions = { ...mockOptions };
      const invalidOptions = { ...mockOptions, format: 'invalid' as any };
      
      const results = await batchExport([validOptions, invalidOptions], 'latex');
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].filename).toBe('测试论文标题.tex');
    });
  });

  describe('downloadFile', () => {
    it('should create and click download link', () => {
      // Mock document methods
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      const mockClick = jest.fn();
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockRevokeObjectURL = jest.fn();
      
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;
      document.createElement = jest.fn(() => ({
        click: mockClick,
        href: '',
        download: ''
      })) as any;
      
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;
      
      const blob = new Blob(['test content'], { type: 'text/plain' });
      downloadFile(blob, 'test.txt');
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });
});
