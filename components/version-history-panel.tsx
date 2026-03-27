"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { VersionComparePanel } from "@/components/version-compare-panel";
import { formatArchiveTime } from "@/lib/project-archive";
import type { ProjectVersionPayload, ProjectVersionRecord } from "@/lib/project-version-types";

type VersionHistoryPanelProps<TPayload extends ProjectVersionPayload> = {
  title: string;
  description: string;
  versions: ProjectVersionRecord<TPayload>[];
  loading: boolean;
  error?: string;
  currentFingerprint: string;
  onRestore: (version: ProjectVersionRecord<TPayload>) => void;
};

export function VersionHistoryPanel<TPayload extends ProjectVersionPayload>({
  title,
  description,
  versions,
  loading,
  error,
  currentFingerprint,
  onRestore
}: VersionHistoryPanelProps<TPayload>) {
  const [showCompare, setShowCompare] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

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

  return (
    <section className="content-card content-card--soft">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">版本历史</span>
        <h3>{title}</h3>
      </div>
      <p className="lead-text">{description}</p>

      {loading ? (
        <div className="hint-panel top-gap">
          <strong>正在读取历史版本</strong>
          <p>稍等一下，服务端正在把这一步以前确认过的版本拿回来。</p>
        </div>
      ) : null}

      {!loading && versions.length === 0 ? (
        <div className="hint-panel top-gap">
          <strong>还没有服务端历史</strong>
          <p>你第一次点击确认并存档后，这里就会出现可回滚的版本记录。</p>
        </div>
      ) : null}

      {error ? (
        <div className="hint-panel top-gap">
          <strong>历史版本读取提醒</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && versions.length > 0 ? (
        <>
          <div className="version-actions top-gap">
            <button
              onClick={() => setShowCompare(true)}
              className="secondary-button"
              disabled={versions.length < 2}
            >
              对比版本
            </button>
          </div>

          <div className="version-history top-gap">
            {versions.map((version) => {
              const isCurrent = version.fingerprint === currentFingerprint;
              const isSelected = selectedVersions.includes(version.id);

              return (
                <div
                  key={version.id}
                  className={`version-record ${isSelected ? "selected" : ""}`}
                  onClick={() => handleVersionSelect(version.id)}
                >
                  <div className="line-item__head">
                    <strong>{version.title}</strong>
                    <StatusBadge tone={isCurrent ? "sage" : "default"}>
                      {isCurrent ? "当前内容" : formatArchiveTime(version.createdAt)}
                    </StatusBadge>
                  </div>
                  <p>{version.summary}</p>
                  <div className="version-meta">
                    <span className="version-date">{formatDate(version.createdAt)}</span>
                  </div>
                  <div className="button-row top-gap">
                    <button
                      className={isCurrent ? "secondary-button" : "primary-button"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(version);
                      }}
                      type="button"
                    >
                      {isCurrent ? "当前已恢复到这一版" : "恢复到这一版"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {showCompare && (
        <VersionComparePanel
          versions={versions}
          onClose={() => {
            setShowCompare(false);
            setSelectedVersions([]);
          }}
        />
      )}

      <style jsx>{`
        .version-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
        }

        .version-record {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .version-record:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .version-record.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .version-meta {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 0.75rem;
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
      `}</style>
    </section>
  );
}
