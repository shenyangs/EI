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
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("latex");
  const [message, setMessage] = useState<string>("");

  const handleExport = async () => {
    setExporting(true);
    setMessage("正在生成文档...");

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
        setMessage(`导出失败：${result.error || "未知错误"}`);
      }
    } catch (error) {
      setMessage(`导出失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    { value: "latex", label: "LaTeX (.tex)", description: "适合正式学术排版，支持复杂公式和模板控制" },
    { value: "docx", label: "Word (.html)", description: "适合继续人工修改，可在 Word 中打开整理" },
    { value: "pdf", label: "PDF (.html)", description: "适合快速打印、校阅和分享当前版本" }
  ];
  const charCount = [
    projectTitle,
    abstract,
    keywords.join("、"),
    ...sections.flatMap((section) => section.content)
  ]
    .join("")
    .replace(/\s+/g, "").length;
  const paragraphCount = sections.reduce((count, section) => count + section.content.length, 0);
  const selectedFormatMeta = formatOptions.find((option) => option.value === selectedFormat);

  return (
    <section className="content-card stitch-panel">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">格式导出</span>
        <h3>确认这一版要以什么格式交付</h3>
      </div>

      <div className="decision-metrics">
        <div className="decision-metric">
          <span>章节数</span>
          <strong>{sections.length}</strong>
          <p>导出前先确认整体结构已经稳定。</p>
        </div>
        <div className="decision-metric">
          <span>段落数</span>
          <strong>{paragraphCount}</strong>
          <p>如果段落过少，通常说明论证还不够完整。</p>
        </div>
        <div className="decision-metric">
          <span>预计字数</span>
          <strong>{charCount}</strong>
          <p>交付前最好对照会议篇幅要求再看一遍。</p>
        </div>
      </div>

      <div className="fulltext-review-grid top-gap">
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">导出格式</span>
            <h3>先确定这一版最终怎么交付</h3>
          </div>

          <div className="stack-list">
            {formatOptions.map((option) => (
              <label
                key={option.value}
                className={`line-item line-item--link export-format-card ${selectedFormat === option.value ? "choice-card--active" : ""}`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  value={option.value}
                  checked={selectedFormat === option.value}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  className="export-format-card__input"
                />
                <div className="line-item__head">
                  <strong>{option.label}</strong>
                  {selectedFormat === option.value && (
                    <span className="status-badge sage">当前采用</span>
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
              {exporting ? "导出中..." : "导出文档"}
            </button>
          </div>

          {message && (
            <div className={`hint-panel top-gap ${message.includes("失败") ? "error" : ""}`}>
              <strong>{message.includes("失败") ? "导出状态" : "导出成功"}</strong>
              <p>{message}</p>
            </div>
          )}
        </section>

        <div className="fulltext-review-rail">
          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">当前选择</span>
              <h3>{selectedFormatMeta?.label ?? "导出格式"}</h3>
            </div>
            <div className="stack-list">
              <div className="line-item line-item--column">
                <strong>为什么选它</strong>
                <p>{selectedFormatMeta?.description}</p>
              </div>
              <div className="line-item line-item--column">
                <strong>当前会议</strong>
                <p>{venueProfile.name}</p>
              </div>
              <div className="line-item line-item--column">
                <strong>模板与出版方</strong>
                <p>{venueProfile.template}；{venueProfile.publisher}</p>
              </div>
            </div>
          </section>

          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">导出说明</span>
              <h3>导出前最后再对一遍</h3>
            </div>
            <div className="stack-list">
              <div className="line-item line-item--column">
                <strong>LaTeX 格式</strong>
                <p>生成 `.tex` 文件，适合走正式会议模板和后续学术排版。</p>
              </div>
              <div className="line-item line-item--column">
                <strong>Word 格式</strong>
                <p>生成 HTML 文件，可在 Word 中打开并继续调整版式。</p>
              </div>
              <div className="line-item line-item--column">
                <strong>PDF 格式</strong>
                <p>生成 HTML 文件，可在浏览器中打印为 PDF 用于审阅。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
