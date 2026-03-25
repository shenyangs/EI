import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import type { AiQualityReport } from "@/lib/quality-check";
import {
  getPriorityReviewAction,
  getReviewAction,
  type ReviewActionContext
} from "@/lib/quality-review-actions";

type QualityReviewPanelProps = {
  report: AiQualityReport | null;
  title?: string;
  loading?: boolean;
  emptyText?: string;
  actionContext?: ReviewActionContext;
};

function toneFromLevel(level: AiQualityReport["overall"] | "通过" | "建议修改" | "必须修改") {
  if (level === "通过") {
    return "sage" as const;
  }

  if (level === "建议修改") {
    return "amber" as const;
  }

  return "rose" as const;
}

export function QualityReviewPanel({
  report,
  title = "AI 自检结果",
  loading = false,
  emptyText = "生成后会在这里出现自检结果。",
  actionContext
}: QualityReviewPanelProps) {
  const priorityAction =
    report && actionContext ? getPriorityReviewAction(report.checks, actionContext) : null;

  return (
    <section className="content-card">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">质量门</span>
        <h3>{title}</h3>
      </div>

      {loading ? <p className="lead-text">AI 正在检查长度、结构与会议适配度...</p> : null}

      {!loading && !report ? <p className="lead-text">{emptyText}</p> : null}

      {report ? (
        <div className="stack-list top-gap">
          <div className="line-item line-item--column">
            <div className="line-item__head">
              <strong>{report.summary}</strong>
              <StatusBadge tone={toneFromLevel(report.overall)}>{report.overall}</StatusBadge>
            </div>
            <span>
              当前约 {report.metrics.charCount} 字，{report.metrics.paragraphCount} 段。
            </span>
            {priorityAction ? (
              <div className="review-actions">
                <Link className="primary-button review-action-button" href={priorityAction.href}>
                  {priorityAction.label}
                </Link>
              </div>
            ) : null}
          </div>

          {report.checks.map((item) => {
            const action = actionContext ? getReviewAction(item, actionContext) : null;

            return (
              <div key={`${item.dimension}-${item.detail}`} className="line-item line-item--column">
                <div className="line-item__head">
                  <strong>{item.dimension}</strong>
                  <StatusBadge tone={toneFromLevel(item.level)}>{item.level}</StatusBadge>
                </div>
                <span>{item.detail}</span>
                {action ? (
                  <div className="review-actions">
                    <Link className="secondary-button review-action-button" href={action.href}>
                      {action.label}
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}

          {report.rewritePriorities.length > 0 ? (
            <div className="line-item line-item--column">
              <strong>优先修改</strong>
              <ul className="bullet-list">
                {report.rewritePriorities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
