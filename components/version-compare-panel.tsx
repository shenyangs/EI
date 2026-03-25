"use client";

import { useState } from "react";

import type { ProjectVersionPayload, ProjectVersionRecord } from "@/lib/project-version-types";

type VersionComparePanelProps = {
  versions: ProjectVersionRecord<ProjectVersionPayload>[];
  currentVersion?: ProjectVersionRecord<ProjectVersionPayload>;
  onClose: () => void;
};

export function VersionComparePanel({
  versions,
  currentVersion,
  onClose
}: VersionComparePanelProps) {
  const [leftVersionId, setLeftVersionId] = useState<string>(versions[0]?.id || "");
  const [rightVersionId, setRightVersionId] = useState<string>(
    currentVersion?.id || versions[versions.length - 1]?.id || ""
  );

  const leftVersion = versions.find((v) => v.id === leftVersionId) || versions[0];
  const rightVersion = versions.find((v) => v.id === rightVersionId) || currentVersion;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getVersionContent = (version: ProjectVersionRecord<ProjectVersionPayload> | undefined) => {
    if (!version) return "无内容";

    const payload = version.payload;
    let content = "";

    switch (payload.type) {
      case "outline":
        content = `大纲版本\n标题: ${(payload as any).customTitle || version.title}\n摘要备注: ${(payload as any).customAbstractNote || "无"}`;
        break;
      case "chapter":
        content = `章节版本\n章节ID: ${(payload as any).chapterId}\n段落数: ${(payload as any).paragraphs?.length || 0}`;
        break;
      case "topic-direction":
        content = `研究方向版本\n选中方向: ${(payload as any).selectedId}\n备注: ${(payload as any).customNote || "无"}`;
        break;
      case "fulltext":
        content = `全文版本\n预览: ${(payload as any).generatedPreview?.substring(0, 100) || "无预览内容"}...`;
        break;
      default:
        content = `版本类型: ${(payload as any).type || "未知"}\n摘要: ${version.summary}`;
    }

    return content;
  };

  const renderDiff = () => {
    if (!leftVersion || !rightVersion) {
      return <div className="diff-empty">请选择两个版本进行对比</div>;
    }

    const leftContent = getVersionContent(leftVersion);
    const rightContent = getVersionContent(rightVersion);

    if (leftContent === rightContent) {
      return <div className="diff-same">两个版本内容相同</div>;
    }

    return (
      <div className="diff-content">
        <div className="diff-section">
          <h4>版本 A ({formatDate(leftVersion.createdAt)})</h4>
          <pre className="diff-left">{leftContent}</pre>
        </div>
        <div className="diff-divider">→</div>
        <div className="diff-section">
          <h4>版本 B ({formatDate(rightVersion.createdAt)})</h4>
          <pre className="diff-right">{rightContent}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="compare-panel-overlay" onClick={onClose}>
      <div className="compare-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>版本对比</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="version-selectors">
          <div className="version-select">
            <label>版本 A</label>
            <select
              value={leftVersionId}
              onChange={(e) => setLeftVersionId(e.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.title} ({formatDate(version.createdAt)})
                </option>
              ))}
            </select>
          </div>

          <div className="version-select">
            <label>版本 B</label>
            <select
              value={rightVersionId}
              onChange={(e) => setRightVersionId(e.target.value)}
            >
              {currentVersion && (
                <option value={currentVersion.id}>
                  {currentVersion.title} (当前) - {formatDate(currentVersion.createdAt)}
                </option>
              )}
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.title} ({formatDate(version.createdAt)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="diff-container">{renderDiff()}</div>

        <div className="panel-footer">
          <button onClick={onClose} className="secondary-button">
            关闭
          </button>
        </div>
      </div>

      <style jsx>{`
        .compare-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .compare-panel {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 1000px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
        }

        .close-button:hover {
          color: #1f2937;
        }

        .version-selectors {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .version-select {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .version-select label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .version-select select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .diff-container {
          flex: 1;
          overflow: auto;
          padding: 20px 24px;
        }

        .diff-empty,
        .diff-same {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .diff-content {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: start;
        }

        .diff-section h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .diff-section pre {
          margin: 0;
          padding: 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
          max-height: 400px;
          overflow: auto;
        }

        .diff-left {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .diff-right {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .diff-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: #9ca3af;
          padding: 0 8px;
        }

        .panel-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .secondary-button {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .secondary-button:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}
