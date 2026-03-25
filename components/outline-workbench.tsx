"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import { StatusBadge } from "@/components/status-badge";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import type { OutlineSection, TitlePackage } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
import { useProjectVersionHistory } from "@/lib/project-version-client";
import type { OutlineVersionPayload } from "@/lib/project-version-types";
import type { AiQualityReport } from "@/lib/quality-check";
import { buildVenueHref } from "@/lib/venue-profiles";

type OutlineWorkbenchProps = {
  projectId: string;
  packages?: TitlePackage[];
  outline?: OutlineSection[];
  venueId?: string;
  selectedDirection?: {
    id: string;
    label: string;
    description: string;
  };
  projectTitle?: string;
};

type CheckResponse = {
  ok: boolean;
  error?: string;
} & AiQualityReport;

async function requestCheck(input: {
  title: string;
  content: string;
  venueId?: string;
}) {
  const response = await fetch("/api/ai/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target: "abstract",
      title: input.title,
      content: input.content,
      venueId: input.venueId
    })
  });

  return (await response.json()) as CheckResponse;
}

function badgeTone(status: OutlineSection["status"]) {
  if (status === "已锁定") {
    return "sage" as const;
  }

  if (status === "草稿中") {
    return "amber" as const;
  }

  return "rose" as const;
}

export function OutlineWorkbench({
  projectId,
  packages,
  outline,
  venueId
}: OutlineWorkbenchProps) {
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? "");
  const [customTitle, setCustomTitle] = useState("");
  const [customAbstractNote, setCustomAbstractNote] = useState("");
  const [reviewMap, setReviewMap] = useState<Record<string, AiQualityReport | null>>({});
  const [message, setMessage] = useState("当前框架包已准备好，可继续进入逐章写作。");
  const [reviewLoading, setReviewLoading] = useState(false);
  const {
    archiveCurrent,
    getRecord,
    isReady,
    matchesCurrent,
    upsertRecord
  } = useProjectArchive(projectId);

  const selected = useMemo(
    () => packages.find((item) => item.id === selectedId) ?? packages[0],
    [packages, selectedId]
  );
  const currentTitle = customTitle.trim() || selected?.title || "";
  const currentReviewKey = selected?.id ?? "unknown";

  if (!selected) {
    return null;
  }

  const abstractNote = customAbstractNote.trim();
  const archiveKey = "outline";
  const currentSummary = `标题：${currentTitle}；当前框架共 ${outline.length} 个章节节点${
    abstractNote ? `；摘要提醒：${abstractNote}` : "；摘要暂未附加修改提醒。"
  }`;
  const currentFingerprint = createArchiveFingerprint([selected.id, currentTitle, abstractNote]);
  const archiveRecord = getRecord(archiveKey);
  const isCurrentArchived = matchesCurrent(archiveKey, currentFingerprint);
  const {
    error: historyError,
    loading: historyLoading,
    saveVersion,
    saving,
    versions
  } = useProjectVersionHistory<OutlineVersionPayload>(projectId, archiveKey);

  async function handleArchive() {
    const localRecord = archiveCurrent({
      key: archiveKey,
      fingerprint: currentFingerprint,
      title: currentTitle,
      summary: shortenArchiveText(`来源：${selected.label}；${currentSummary}`)
    });

    setMessage("正在把当前框架写入服务端版本记录...");

    try {
      const version = await saveVersion({
        key: archiveKey,
        fingerprint: currentFingerprint,
        title: currentTitle,
        summary: shortenArchiveText(`来源：${selected.label}；${currentSummary}`),
        payload: {
          type: "outline",
          selectedId: selected.id,
          customTitle,
          customAbstractNote
        }
      });

      upsertRecord({
        ...localRecord,
        archivedAt: version.createdAt
      });
      setMessage("已确认并同步到服务端版本记录。后面如果你继续改标题或摘要提醒，系统会明确提示这一页有新改动还没再次存档。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "服务端版本保存失败，但本地确认状态已保留。");
    }
  }

  function restoreVersion(version: (typeof versions)[number]) {
    setSelectedId(version.payload.selectedId);
    setCustomTitle(version.payload.customTitle);
    setCustomAbstractNote(version.payload.customAbstractNote);
    upsertRecord({
      key: archiveKey,
      fingerprint: version.fingerprint,
      title: version.title,
      summary: version.summary,
      archivedAt: version.createdAt
    });
    setMessage("已恢复到之前确认过的框架版本。你现在看到的标题、摘要提醒和章节骨架，已经回到那次存档时的状态。");
  }

  async function runPackageCheck() {
    const abstractContent = selected.abstract;

    setReviewLoading(true);
    setMessage(`正在检查“${selected.label}”的标题与摘要质量...`);

    try {
      const result = await requestCheck({
        title: currentTitle,
        content: abstractContent,
        venueId
      });

      if (!result.ok) {
        throw new Error(result.error ?? "标题摘要自检失败");
      }

      setReviewMap((current) => ({
        ...current,
        [currentReviewKey]: {
          overall: result.overall,
          summary: result.summary,
          checks: result.checks,
          rewritePriorities: result.rewritePriorities,
          metrics: result.metrics
        }
      }));
      setMessage("标题摘要已完成自检，你可以先看风险提示，再决定是否继续进入正文。");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "标题摘要自检失败。";

      setReviewMap((current) => ({
        ...current,
        [currentReviewKey]: {
          overall: "建议修改",
          summary: "当前未能拿到完整标题摘要自检结果",
          checks: [
            {
              dimension: "自检链路",
              level: "建议修改",
              detail: errorMessage
            }
          ],
          rewritePriorities: ["稍后重新检查当前标题摘要"],
          metrics: {
            charCount: abstractContent.replace(/\s+/g, "").length,
            paragraphCount: 1
          }
        }
      }));
      setMessage("标题摘要自检暂时失败，已经保留错误信息，你可以稍后重试。");
    } finally {
      setReviewLoading(false);
    }
  }

  useEffect(() => {
    if (reviewMap[currentReviewKey]) {
      return;
    }

    void runPackageCheck();
  }, [currentReviewKey, reviewMap, selected.abstract, selected.label, venueId]);

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第三步</span>
          <h3>先定一套框架包，再进入正文写作。</h3>
        </div>
        <p className="lead-text">
          移动版把框架页拆成 4 段：先看当前采用的方案，再切换框架包，再微调标题和摘要提醒，最后看章节骨架和存档。
        </p>
        <div className="selection-spotlight top-gap">
          <div>
            <span className="selection-spotlight__label">当前采用</span>
            <strong>{currentTitle}</strong>
            <p>{selected.positioning}</p>
          </div>
          <StatusBadge tone="sage">{selected.label}</StatusBadge>
        </div>
        <div className="keyword-cluster top-gap">
          {selected.keywords.map((item) => (
            <span key={item} className="ghost-chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">标题与摘要方案</span>
          <h3>AI 先出 3 套可直接采用的框架包</h3>
        </div>
        <div className="stack-list">
          {packages.map((item) => {
            const isActive = item.id === selected.id;

            return (
              <button
                key={item.id}
                className={isActive ? "choice-card choice-card--active" : "choice-card"}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="line-item__head">
                  <strong>{item.label}</strong>
                  <StatusBadge tone={isActive ? "sage" : "default"}>
                    {isActive ? "当前采用" : "点我切换"}
                  </StatusBadge>
                </div>
                <p className="choice-card__title">{item.title}</p>
                <p>{item.positioning}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="project-page-grid">
        <section className="content-card anchor-section" id="outline-packages">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前框架包</span>
            <h3>这套内容已经够你继续往下写</h3>
          </div>
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>当前标题</strong>
              <p>{currentTitle}</p>
            </div>
            <div className="line-item line-item--column">
              <strong>摘要草稿</strong>
              <p>{selected.abstract}</p>
            </div>
            <div className="line-item line-item--column">
              <strong>为什么推荐</strong>
              <p>{selected.recommendedReason}</p>
            </div>
          </div>
          <div className="button-row top-gap">
            <button className="secondary-button" onClick={() => void runPackageCheck()} type="button">
              {reviewLoading ? "检查中..." : "重新检查标题摘要"}
            </button>
          </div>
        </section>

        <section className="content-card anchor-section" id="outline-editing">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">允许你改</span>
            <h3>如果标题或摘要方向不顺手，可以先在这里微调</h3>
          </div>
          <div className="form-grid">
            <div className="field field--full">
              <span>手动改标题</span>
              <input
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder={selected.title}
                value={customTitle}
              />
            </div>
            <div className="field field--full">
              <span>给摘要一个修改提醒</span>
              <textarea
                onChange={(event) => setCustomAbstractNote(event.target.value)}
                placeholder="例如：摘要结果句要更克制，别写得像结题报告。"
                rows={3}
                value={customAbstractNote}
              />
            </div>
          </div>
          <div className="hint-panel top-gap">
            <strong>系统反馈</strong>
            <p>{message}</p>
          </div>
        </section>
      </div>

      <QualityReviewPanel
        actionContext={{
          scope: "outline",
          projectId,
          sections: outline.map((section) => ({
            id: section.id,
            title: section.title
          })),
          venueId
        }}
        emptyText="当前框架包生成后，系统会自动检查标题、摘要长度、结构和会议适配度。"
        loading={reviewLoading}
        report={reviewMap[currentReviewKey] ?? null}
        title="标题摘要 AI 自检"
      />

      <section className="content-card anchor-section" id="outline-structure">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">章节骨架</span>
          <h3>每章写什么，AI 也应该提前拆给你看</h3>
        </div>
        <div className="outline-list">
          {outline.map((section, index) => (
            <div key={section.id} className="outline-item">
              <div className="outline-item__index">0{index + 1}</div>
              <div className="outline-item__body">
                <div className="outline-item__head">
                  <strong>{section.title}</strong>
                  <StatusBadge tone={badgeTone(section.status)}>{section.status}</StatusBadge>
                </div>
                <p>{section.goal}</p>
                <p className="section-summary">{section.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ArchiveActionPanel
        archiveLabel="确认并存档当前框架"
        archivedAt={archiveRecord?.archivedAt}
        archivedSummary={
          archiveRecord ? `${archiveRecord.title}：${archiveRecord.summary}` : undefined
        }
        currentLabel="当前将被锁定的框架版本"
        currentSummary={currentSummary}
        description="框架页真正重要的不是“看过 3 套方案”，而是把你要继续写下去的这一版正式固定下来。这样后面的正文、检查和导出，才都有明确基线。"
        helperText={
          isCurrentArchived
            ? "这一版框架已经留下明确记录了。后面如果你继续改标题或摘要提醒，这里会立刻变成“当前内容有新改动”，提醒你重新定稿。"
            : "先确认并存档，再进入逐章写作。否则后面章节内容和框架版本很容易越写越对不上。"
        }
        archiveDisabled={saving}
        isCurrentArchived={isCurrentArchived}
        onArchive={handleArchive}
        secondaryAction={
          <div className="button-row">
            <Link
              className="secondary-button"
              href={buildVenueHref(`/projects/${projectId}/profile`, venueId)}
            >
              返回题目类型
            </Link>
            {isReady && isCurrentArchived ? (
              <Link
                className="primary-button"
                href={buildVenueHref(`/projects/${projectId}/writing`, venueId)}
              >
                用这份已存档框架进入逐章写作
              </Link>
            ) : (
              <button className="secondary-button" disabled type="button">
                {isReady ? "先确认并存档，再进入逐章写作" : "正在读取本地存档..."}
              </button>
            )}
          </div>
        }
        title="框架不是看一眼就算，得把这一版正式锁住"
      />

      <VersionHistoryPanel
        currentFingerprint={currentFingerprint}
        description="这里记录的是你正式确认过的框架版本。回滚后，逐章写作会重新建立在这版标题、摘要和章节骨架之上。"
        error={historyError}
        loading={historyLoading}
        onRestore={restoreVersion}
        title="论文框架历史记录"
        versions={versions}
      />
    </div>
  );
}
