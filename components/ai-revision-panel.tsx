"use client";

import { useCallback, useEffect, useState } from "react";

import { StreamingAiPanel } from "@/components/streaming-ai-panel";
import type { AiQualityReport } from "@/lib/quality-check";

type RevisionSuggestion = {
  id: string;
  section: string;
  issue: string;
  suggestion: string;
  severity: "high" | "medium" | "low";
  originalText?: string;
  revisedText?: string;
  applied: boolean;
};

type AiRevisionPanelProps = {
  projectId: string;
  content: string;
  qualityReport: AiQualityReport | null;
  venueId?: string;
  onApplyRevision?: (revision: RevisionSuggestion) => void;
  onApplyAll?: (revisions: RevisionSuggestion[]) => void;
};

export function AiRevisionPanel({
  projectId,
  content,
  qualityReport,
  venueId,
  onApplyRevision,
  onApplyAll
}: AiRevisionPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [revisions, setRevisions] = useState<RevisionSuggestion[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionSuggestion | null>(null);
  const [showStreaming, setShowStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"suggestions" | "preview">("suggestions");

  const generateRevisionSuggestions = useCallback(async () => {
    if (!qualityReport) return;

    setIsGenerating(true);
    setShowStreaming(true);
  }, [qualityReport]);

  useEffect(() => {
    if (qualityReport && qualityReport.checks.length > 0) {
      void generateRevisionSuggestions();
    }
  }, [generateRevisionSuggestions, qualityReport]);

  const handleApplyRevision = (revision: RevisionSuggestion) => {
    const updatedRevisions = revisions.map((rev) =>
      rev.id === revision.id ? { ...rev, applied: true } : rev
    );
    setRevisions(updatedRevisions);
    onApplyRevision?.(revision);
  };

  const handleApplyAll = () => {
    const unappliedRevisions = revisions.filter((rev) => !rev.applied);
    const updatedRevisions = revisions.map((rev) => ({ ...rev, applied: true }));
    setRevisions(updatedRevisions);
    onApplyAll?.(unappliedRevisions);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#dc2626";
      case "medium":
        return "#d97706";
      case "low":
        return "#059669";
      default:
        return "#6b7280";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "high":
        return "高优先级";
      case "medium":
        return "中优先级";
      case "low":
        return "低优先级";
      default:
        return "普通";
    }
  };

  if (showStreaming) {
    return (
      <div className="revision-panel">
        <StreamingAiPanel
          taskType="revision_suggestions"
          context={{
            projectId,
            content,
            qualityReport,
            venueId
          }}
          onComplete={(result) => {
            setShowStreaming(false);
            setIsGenerating(false);
            if (result.revisions) {
              const formattedRevisions: RevisionSuggestion[] = result.revisions.map(
                (rev: any, index: number) => ({
                  id: `rev_${Date.now()}_${index}`,
                  section: rev.section || "未指定部分",
                  issue: rev.issue || "需要改进",
                  suggestion: rev.suggestion || "",
                  severity: rev.severity || "medium",
                  originalText: rev.originalText,
                  revisedText: rev.revisedText,
                  applied: false
                })
              );
              setRevisions(formattedRevisions);
            }
          }}
          onError={() => {
            setShowStreaming(false);
            setIsGenerating(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="revision-panel">
      <div className="panel-header">
        <h3>AI 智能改稿建议</h3>
        <div className="header-actions">
          {revisions.length > 0 && (
            <>
              <span className="revision-count">
                {revisions.filter((r) => !r.applied).length} 条待处理
              </span>
              <button
                onClick={handleApplyAll}
                disabled={revisions.every((r) => r.applied)}
                className="primary-button"
              >
                全部应用
              </button>
            </>
          )}
          <button
            onClick={generateRevisionSuggestions}
            disabled={isGenerating}
            className="secondary-button"
          >
            {isGenerating ? "生成中..." : "重新生成建议"}
          </button>
        </div>
      </div>

      {revisions.length === 0 ? (
        <div className="empty-state">
          <p>暂无改稿建议</p>
          <p>点击“重新生成建议”按钮获取 AI 智能改稿建议</p>
        </div>
      ) : (
        <>
          {/* Tab 切换 */}
          <div className="tab-navigation">
            <button
              className={activeTab === "suggestions" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("suggestions")}
            >
              改稿建议 ({revisions.length})
            </button>
            <button
              className={activeTab === "preview" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("preview")}
            >
              修改预览
            </button>
          </div>

          {activeTab === "suggestions" && (
            <div className="revisions-list">
              {revisions.map((revision) => (
                <div
                  key={revision.id}
                  className={`revision-item ${revision.applied ? "applied" : ""}`}
                  onClick={() => setSelectedRevision(revision)}
                >
                  <div className="revision-header">
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(revision.severity) }}
                    >
                      {getSeverityLabel(revision.severity)}
                    </span>
                    <span className="section-name">{revision.section}</span>
                    {revision.applied && <span className="applied-badge">已应用</span>}
                  </div>
                  <p className="issue-text">{revision.issue}</p>
                  <p className="suggestion-text">{revision.suggestion}</p>
                  {!revision.applied && (
                    <div className="revision-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyRevision(revision);
                        }}
                        className="primary-button small"
                      >
                        应用修改
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "preview" && selectedRevision && (
            <div className="revision-preview">
              <div className="preview-header">
                <h4>修改对比</h4>
                <button
                  onClick={() => setSelectedRevision(null)}
                  className="text-button"
                >
                  关闭预览
                </button>
              </div>
              <div className="comparison-view">
                {selectedRevision.originalText && (
                  <div className="original-section">
                    <h5>原文</h5>
                    <div className="text-content original">
                      {selectedRevision.originalText}
                    </div>
                  </div>
                )}
                {selectedRevision.revisedText && (
                  <div className="revised-section">
                    <h5>修改后</h5>
                    <div className="text-content revised">
                      {selectedRevision.revisedText}
                    </div>
                  </div>
                )}
                {!selectedRevision.originalText && !selectedRevision.revisedText && (
                  <div className="no-preview">
                    <p>此建议没有具体的文本修改预览</p>
                    <p>建议内容: {selectedRevision.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "preview" && !selectedRevision && (
            <div className="empty-preview">
              <p>点击左侧建议查看修改预览</p>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .revision-panel {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .revision-count {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .tab-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .tab-button {
          padding: 8px 16px;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .tab-button.active {
          background: #3b82f6;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .revisions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .revision-item {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .revision-item:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .revision-item.applied {
          opacity: 0.6;
          background: #f9fafb;
        }

        .revision-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .severity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .section-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .applied-badge {
          margin-left: auto;
          padding: 4px 8px;
          background: #dcfce7;
          color: #166534;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .issue-text {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
        }

        .suggestion-text {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .revision-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
        }

        .revision-preview {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .preview-header h4 {
          margin: 0;
          font-size: 1rem;
          color: #1f2937;
        }

        .comparison-view {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .original-section,
        .revised-section {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }

        .original-section h5,
        .revised-section h5 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .text-content {
          font-size: 0.875rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .text-content.original {
          color: #dc2626;
          background: #fef2f2;
          padding: 8px;
          border-radius: 4px;
        }

        .text-content.revised {
          color: #059669;
          background: #ecfdf5;
          padding: 8px;
          border-radius: 4px;
        }

        .no-preview,
        .empty-preview {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .primary-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .primary-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-button.small {
          padding: 6px 12px;
          font-size: 0.75rem;
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

        .secondary-button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .text-button {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .text-button:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
