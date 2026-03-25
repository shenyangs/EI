"use client";

import { useState } from "react";

import { exportDocument, downloadFile, type ExportFormat } from "@/lib/export/document-export";
import type { VenueProfile } from "@/lib/venue-profiles";

type ExportPanelProps = {
  projectTitle: string;
  abstract: string;
  keywords: string[];
  sections: {
    id: string;
    title: string;
    content: string[];
  }[];
  venueProfile: VenueProfile;
};

export function ExportPanel({
  projectTitle,
  abstract,
  keywords,
  sections,
  venueProfile
}: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('latex');
  const [message, setMessage] = useState<string>('');

  const handleExport = async () => {
    setExporting(true);
    setMessage('正在生成文档...');

    try {
      const result = await exportDocument({
        format: selectedFormat,
        projectTitle,
        abstract,
        keywords,
        sections,
        venueProfile
      });

      if (result.success && result.blob && result.filename) {
        downloadFile(result.blob, result.filename);
        setMessage(`文档已成功导出：${result.filename}`);
      } else {
        setMessage(`导出失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      setMessage(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    { value: 'latex', label: 'LaTeX (.tex)', description: '适合学术排版，支持复杂公式' },
    { value: 'docx', label: 'Word (.html)', description: '可在Word中打开编辑' },
    { value: 'pdf', label: 'PDF (.html)', description: '适合打印和分享' }
  ];

  return (
    <section className="content-card">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">格式导出</span>
        <h3>选择导出格式</h3>
      </div>
      
      <div className="stack-list">
        {formatOptions.map((option) => (
          <label 
            key={option.value} 
            className={`line-item line-item--link ${selectedFormat === option.value ? 'choice-card--active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="radio"
              name="exportFormat"
              value={option.value}
              checked={selectedFormat === option.value}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              style={{ display: 'none' }}
            />
            <div className="line-item__head">
              <strong>{option.label}</strong>
              {selectedFormat === option.value && (
                <span className="status-badge sage">已选择</span>
              )}
            </div>
            <span>{option.description}</span>
          </label>
        ))}
      </div>

      <div className="button-row top-gap">
        <button 
          className="primary-button" 
          onClick={handleExport}
          disabled={exporting}
          type="button"
        >
          {exporting ? '导出中...' : '导出文档'}
        </button>
      </div>

      {message && (
        <div className={`hint-panel top-gap ${message.includes('失败') ? 'error' : ''}`}>
          <strong>{message.includes('失败') ? '导出状态' : '导出成功'}</strong>
          <p>{message}</p>
        </div>
      )}

      <div className="hint-panel top-gap">
        <strong>导出说明</strong>
        <p>
          • LaTeX格式：生成.tex文件，需要使用LaTeX编辑器编译<br/>
          • Word格式：生成HTML文件，可直接在Word中打开并另存为.docx<br/>
          • PDF格式：生成HTML文件，可在浏览器中打印为PDF
        </p>
      </div>
    </section>
  );
}
