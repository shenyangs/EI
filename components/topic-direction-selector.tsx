"use client";

import Link from "next/link";
import { useState } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { StatusBadge } from "@/components/status-badge";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import type { TopicTypeOption } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
import { useProjectVersionHistory } from "@/lib/project-version-client";
import type { TopicDirectionVersionPayload } from "@/lib/project-version-types";
import { buildVenueHref } from "@/lib/venue-profiles";

type TopicDirectionSelectorProps = {
  projectId: string;
  options: TopicTypeOption[];
  venueId?: string;
};

function toneFromConfidence(confidence: string) {
  if (confidence.startsWith("9")) {
    return "sage" as const;
  }

  if (confidence.startsWith("7")) {
    return "amber" as const;
  }

  return "default" as const;
}

export function TopicDirectionSelector({
  projectId,
  options,
  venueId
}: TopicDirectionSelectorProps) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const [customNote, setCustomNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("确认并存档后，服务端会保留可回滚的方向版本。");
  const { archiveCurrent, getRecord, isReady, matchesCurrent, upsertRecord } = useProjectArchive(projectId);

  const selected = options.find((item) => item.id === selectedId) ?? options[0];
  const currentNote = customNote.trim();

  if (!selected) {
    return null;
  }

  const archiveKey = "topic-direction";
  const currentSummary = `当前采用：${selected.label}${
    currentNote ? `；附加提醒：${currentNote}` : "；暂未附加人工修改意见。"
  }`;
  const currentFingerprint = createArchiveFingerprint([selected.id, currentNote]);
  const archiveRecord = getRecord(archiveKey);
  const isCurrentArchived = matchesCurrent(archiveKey, currentFingerprint);
  const {
    error: historyError,
    loading: historyLoading,
    saveVersion,
    saving,
    versions
  } = useProjectVersionHistory<TopicDirectionVersionPayload>(projectId, archiveKey);

  async function handleArchive() {
    const localRecord = archiveCurrent({
      key: archiveKey,
      fingerprint: currentFingerprint,
      title: selected.label,
      summary: shortenArchiveText(currentSummary)
    });

    setStatusMessage("正在把这一版方向写入服务端版本记录...");

    try {
      const version = await saveVersion({
        key: archiveKey,
        fingerprint: currentFingerprint,
        title: selected.label,
        summary: shortenArchiveText(currentSummary),
        payload: {
          type: "topic-direction",
          selectedId: selected.id,
          customNote: currentNote
        }
      });

      upsertRecord({
        ...localRecord,
        archivedAt: version.createdAt
      });
      setStatusMessage("已确认并同步到服务端版本记录。后面如果你改方向，这里会明确告诉你当前内容和已存档版本已经不一致。");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "服务端版本保存失败，但本地确认状态已保留。");
    }
  }

  function restoreVersion(version: (typeof versions)[number]) {
    setSelectedId(version.payload.selectedId);
    setCustomNote(version.payload.customNote);
    upsertRecord({
      key: archiveKey,
      fingerprint: version.fingerprint,
      title: version.title,
      summary: version.summary,
      archivedAt: version.createdAt
    });
    setStatusMessage(`已恢复到 ${version.createdAt ? "服务端历史版本" : "该版本"}，你现在看到的是之前确认过的研究方向。`);
  }

  return (
    <div className="project-page-grid">
      <section className="content-card content-card--wide">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第二步</span>
          <h3>先看 AI 给出的题目类型方案，再由你选定或改写。</h3>
        </div>
        <p className="lead-text">
          这一页不该只告诉你“系统判断是什么”，而是应该先把几种写法方案摆出来。你可以直接采用，也可以按自己的想法改。
        </p>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">AI 已备好 3 种写法</span>
          <h3>你先选一种最像你要投的论文</h3>
        </div>
        <div className="stack-list">
          {options.map((option) => {
            const isActive = option.id === selected.id;

            return (
              <button
                key={option.id}
                className={isActive ? "choice-card choice-card--active" : "choice-card"}
                onClick={() => setSelectedId(option.id)}
                type="button"
              >
                <div className="line-item__head">
                  <strong>{option.label}</strong>
                  <StatusBadge tone={toneFromConfidence(option.confidence)}>
                    {option.confidence}
                  </StatusBadge>
                </div>
                <p>{option.description}</p>
                <div className="keyword-cluster top-gap">
                  {option.readyOutputs.map((item) => (
                    <span key={item} className="ghost-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">当前选中方案</span>
          <h3>{selected.label}</h3>
        </div>
        <p className="lead-text">{selected.description}</p>
        <div className="stack-list top-gap">
          <div className="line-item line-item--column">
            <strong>为什么适合</strong>
            <ul className="bullet-list">
              {selected.whyItFits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="line-item line-item--column">
            <strong>后面该怎么写</strong>
            <ul className="bullet-list">
              {selected.writingStrategy.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="content-card content-card--wide">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">你也可以直接改</span>
          <h3>如果你不想完全照着 AI 的方案走，在这里写你的调整方向</h3>
        </div>
        <div className="field field--full">
          <textarea
            onChange={(event) => setCustomNote(event.target.value)}
            placeholder="例如：我想保留设计实践主线，但用户测试部分要写得更重，结果章要突出情感识别度。"
            rows={4}
            value={customNote}
          />
        </div>
        <div className="top-gap">
          <ArchiveActionPanel
            archiveLabel="确认并存档这个方向"
            archivedAt={archiveRecord?.archivedAt}
            archivedSummary={
              archiveRecord ? `${archiveRecord.title}：${archiveRecord.summary}` : undefined
            }
            currentLabel="当前将被锁定的研究方向"
            currentSummary={currentSummary}
            description="这一页最重要的不是“看过了”，而是把你真正决定采用的方向固定下来。后面生成标题、摘要和章节时，都应该基于这次确认后的版本继续。"
            helperText={
              isCurrentArchived
                ? "这一页已经有明确起点了。你后面如果再改方向，这里会立刻提示“当前内容有新改动”，避免你以为系统还在沿用旧决定。"
                : "先确认并存档，后面的框架才有稳定出发点。否则你每次切方案，都很难说清当前框架到底是基于哪条路线生成的。"
            }
            archiveDisabled={saving}
            isCurrentArchived={isCurrentArchived}
            onArchive={handleArchive}
            secondaryAction={
              isReady && isCurrentArchived ? (
                <Link
                  className="primary-button"
                  href={buildVenueHref(`/projects/${projectId}/outline`, venueId)}
                >
                  用这份已存档方向生成论文框架
                </Link>
              ) : (
                <button className="secondary-button" disabled type="button">
                  {isReady ? "先确认并存档，再进入论文框架" : "正在读取本地存档..."}
                </button>
              )
            }
            title="别只选方向，要把这一版正式留档"
          />
        </div>
        <div className="hint-panel top-gap">
          <strong>系统反馈</strong>
          <p>{statusMessage}</p>
        </div>
        <div className="top-gap">
          <VersionHistoryPanel
            currentFingerprint={currentFingerprint}
            description="这里保存的是你曾经正式点过确认的方向版本。回滚后，后面的框架会重新基于这版方向继续。"
            error={historyError}
            loading={historyLoading}
            onRestore={restoreVersion}
            title="研究方向历史记录"
            versions={versions}
          />
        </div>
      </section>
    </div>
  );
}
