"use client";

import { useEffect, useRef } from "react";

import { StatusBadge } from "@/components/status-badge";
import { useToastHelpers } from "@/components/ui/toast";
import { formatArchiveTime } from "@/lib/project-archive";

type ArchiveActionPanelProps = {
  title: string;
  description: string;
  currentLabel: string;
  currentSummary: string;
  archiveLabel: string;
  onArchive: () => void;
  archiveDisabled?: boolean;
  isCurrentArchived: boolean;
  archivedAt?: string | null;
  archivedSummary?: string;
  archiveReadyLabel?: string;
  helperText?: string;
  secondaryAction?: React.ReactNode;
};

function toneFromArchiveState(isCurrentArchived: boolean, archivedAt?: string | null) {
  if (isCurrentArchived) {
    return "sage" as const;
  }

  if (archivedAt) {
    return "amber" as const;
  }

  return "rose" as const;
}

function labelFromArchiveState(isCurrentArchived: boolean, archivedAt?: string | null) {
  if (isCurrentArchived) {
    return "当前版本已存档";
  }

  if (archivedAt) {
    return "当前内容有新改动";
  }

  return "还没存档";
}

function buildArchiveFeedback(isCurrentArchived: boolean, archivedAt?: string | null) {
  if (isCurrentArchived) {
    return {
      tone: "success" as const,
      title: "这一步已经存档成功",
      description: archivedAt
        ? `最新存档时间：${formatArchiveTime(archivedAt)}。如果你继续修改内容，这里会自动改成“当前内容有新改动”。`
        : "当前页面内容已经和最近一次存档保持一致，可以放心继续下一步。"
    };
  }

  if (archivedAt) {
    return {
      tone: "warning" as const,
      title: "你已经改动了当前内容",
      description: "最近一次存档还在，但这版最新修改还没有重新确认并存档。"
    };
  }

  return {
    tone: "pending" as const,
    title: "这一步还没有完成存档",
    description: "建议先确认并存档，再进入下一步，这样后面才能清楚知道当前基线版本。"
  };
}

export function ArchiveActionPanel({
  title,
  description,
  currentLabel,
  currentSummary,
  archiveLabel,
  onArchive,
  archiveDisabled = false,
  isCurrentArchived,
  archivedAt,
  archivedSummary,
  archiveReadyLabel = "已存档，可重新确认",
  helperText,
  secondaryAction
}: ArchiveActionPanelProps) {
  const previousArchivedRef = useRef(isCurrentArchived);
  const isFirstRenderRef = useRef(true);
  const { success } = useToastHelpers();
  const archiveFeedback = buildArchiveFeedback(isCurrentArchived, archivedAt);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousArchivedRef.current = isCurrentArchived;
      return;
    }

    if (!previousArchivedRef.current && isCurrentArchived) {
      success(
        "已成功存档",
        archivedAt
          ? `这一步已在 ${formatArchiveTime(archivedAt)} 存档完成。`
          : "这一步已经完成存档，可以放心继续下一步。"
      );
    }

    previousArchivedRef.current = isCurrentArchived;
  }, [archivedAt, isCurrentArchived, success]);

  return (
    <section className="archive-panel">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">确认并存档</span>
        <h3>{title}</h3>
      </div>
      <p className="lead-text">{description}</p>

      <div className="archive-panel__grid">
        <div className="archive-panel__card">
          <div className="line-item__head">
            <strong>{currentLabel}</strong>
            <StatusBadge tone={toneFromArchiveState(isCurrentArchived, archivedAt)}>
              {labelFromArchiveState(isCurrentArchived, archivedAt)}
            </StatusBadge>
          </div>
          <p>{currentSummary}</p>
        </div>

        <div className="archive-panel__card">
          <div className="line-item__head">
            <strong>最近一次存档</strong>
            <StatusBadge tone={archivedAt ? "sage" : "default"}>
              {archivedAt ? formatArchiveTime(archivedAt) : "暂无"}
            </StatusBadge>
          </div>
          <p>
            {archivedSummary ??
              "你确认后的这一版会在这里留下稳定记录，后面继续改也知道上一次定下来的内容是什么。"}
          </p>
        </div>
      </div>

      <div
        aria-live="polite"
        className={`archive-panel__feedback archive-panel__feedback--${archiveFeedback.tone}`}
      >
        <div className="archive-panel__feedback-icon" aria-hidden="true">
          {archiveFeedback.tone === "success" ? "✓" : archiveFeedback.tone === "warning" ? "!" : "·"}
        </div>
        <div className="archive-panel__feedback-copy">
          <strong>{archiveFeedback.title}</strong>
          <p>{archiveFeedback.description}</p>
        </div>
      </div>

      {helperText ? <p className="archive-panel__helper">{helperText}</p> : null}

      <div className="button-row top-gap">
        <button
          className={isCurrentArchived ? "secondary-button" : "primary-button"}
          disabled={archiveDisabled}
          onClick={onArchive}
          type="button"
        >
          {isCurrentArchived ? archiveReadyLabel : archiveLabel}
        </button>
        {secondaryAction}
      </div>
    </section>
  );
}
