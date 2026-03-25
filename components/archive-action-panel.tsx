"use client";

import { StatusBadge } from "@/components/status-badge";
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
  archiveReadyLabel = "重新确认并存档",
  helperText,
  secondaryAction
}: ArchiveActionPanelProps) {
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
