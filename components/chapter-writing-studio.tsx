"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import { StatusBadge } from "@/components/status-badge";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import type { ChapterDraft } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
import { useProjectVersionHistory } from "@/lib/project-version-client";
import type { ChapterVersionPayload } from "@/lib/project-version-types";
import type { AiQualityReport } from "@/lib/quality-check";
import { buildVenueHref, type VenueProfile } from "@/lib/venue-profiles";


type DraftResponse = {
  ok: boolean;
  content?: string;
  error?: string;
};

type ChapterWritingStudioProps = {
  projectId: string;
  projectTitle: string;
  chapters: ChapterDraft[];
  venueProfile: VenueProfile;
  venueId?: string;
  initialChapterId?: string;
};

async function requestDraft(prompt: string) {
  const response = await fetch("/api/ai/draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  return (await response.json()) as DraftResponse;
}

type CheckResponse = {
  ok: boolean;
  error?: string;
} & AiQualityReport;

async function requestCheck(input: {
  title: string;
  content: string;
  chapterGoal: string;
  venueId: string;
}) {
  const response = await fetch("/api/ai/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target: "chapter",
      title: input.title,
      content: input.content,
      chapterGoal: input.chapterGoal,
      venueId: input.venueId
    })
  });

  return (await response.json()) as CheckResponse;
}

function toneFromStatus(status: ChapterDraft["status"]) {
  if (status === "已确认") {
    return "sage" as const;
  }

  if (status === "可修改") {
    return "amber" as const;
  }

  return "rose" as const;
}

function chapterArchiveLabel(
  chapter: ChapterDraft,
  hasArchive: boolean,
  isCurrentArchived: boolean
) {
  if (isCurrentArchived) {
    return "已确认并存档";
  }

  if (hasArchive) {
    return "已修改待存档";
  }

  if (chapter.status === "已确认") {
    return "已确认待存档";
  }

  return chapter.status;
}

function chapterArchiveTone(
  chapter: ChapterDraft,
  hasArchive: boolean,
  isCurrentArchived: boolean
) {
  if (isCurrentArchived) {
    return "sage" as const;
  }

  if (hasArchive || chapter.status === "已确认") {
    return "amber" as const;
  }

  return toneFromStatus(chapter.status);
}

function toneFromReview(level?: AiQualityReport["overall"]) {
  if (level === "通过") {
    return "sage" as const;
  }

  if (level === "建议修改") {
    return "amber" as const;
  }

  return "rose" as const;
}

export function ChapterWritingStudio({
  projectId,
  projectTitle,
  chapters,
  venueProfile,
  venueId,
  initialChapterId
}: ChapterWritingStudioProps) {
  const [activeId, setActiveId] = useState(() =>
    chapters.some((chapter) => chapter.id === initialChapterId)
      ? initialChapterId ?? ""
      : chapters[0]?.id ?? ""
  );
  const [message, setMessage] = useState("每一章先给你正文，再允许你局部重写。");
  const [customInstruction, setCustomInstruction] = useState("");
  const [draftMap, setDraftMap] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter.paragraphs]))
  );
  const [reviewMap, setReviewMap] = useState<Record<string, AiQualityReport | null>>({});
  const [checkingMap, setCheckingMap] = useState<Record<string, boolean>>({});
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, any>>({});
  const [isPending, startTransition] = useTransition();
  const inFlightIdsRef = useRef(new Set<string>());
  const {
    archiveCurrent,
    getRecord,
    isReady,
    matchesCurrent,
    upsertRecord
  } = useProjectArchive(projectId);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeId) ?? chapters[0],
    [activeId, chapters]
  );

  if (!activeChapter) {
    return null;
  }

  const activeParagraphs = draftMap[activeChapter.id] ?? activeChapter.paragraphs;
  const activeArchiveKey = `chapter:${activeChapter.id}`;
  const activeFingerprint = createArchiveFingerprint(activeParagraphs);
  const activeArchiveRecord = getRecord(activeArchiveKey);
  const isActiveArchived = matchesCurrent(activeArchiveKey, activeFingerprint);
  const {
    error: historyError,
    loading: historyLoading,
    saveVersion,
    saving,
    versions
  } = useProjectVersionHistory<ChapterVersionPayload>(projectId, activeArchiveKey);
  const archivedChapterCount = chapters.filter((chapter) => {
    const paragraphs = draftMap[chapter.id] ?? chapter.paragraphs;

    return matchesCurrent(`chapter:${chapter.id}`, createArchiveFingerprint(paragraphs));
  }).length;
  const allChaptersArchived = archivedChapterCount === chapters.length;

  async function runChapterCheck(chapterId: string, paragraphs: string[], chapterGoal: string, title: string) {
    if (inFlightIdsRef.current.has(chapterId)) {
      return;
    }

    inFlightIdsRef.current.add(chapterId);
    setCheckingMap((current) => ({
      ...current,
      [chapterId]: true
    }));

    try {
      const result = await requestCheck({
        title,
        content: paragraphs.join("\n\n"),
        chapterGoal,
        venueId: venueProfile.id
      });

      if (!result.ok) {
        throw new Error(result.error ?? "自检失败");
      }

      setReviewMap((current) => ({
        ...current,
        [chapterId]: {
          overall: result.overall,
          summary: result.summary,
          checks: result.checks,
          rewritePriorities: result.rewritePriorities,
          metrics: result.metrics
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 自检失败。";

      setReviewMap((current) => ({
        ...current,
        [chapterId]: {
          overall: "建议修改",
          summary: "当前未能拿到完整自检结果",
          checks: [
            {
              dimension: "自检链路",
              level: "建议修改",
              detail: message
            }
          ],
          rewritePriorities: ["稍后重试一次本章自检"],
          metrics: {
            charCount: paragraphs.join("").length,
            paragraphCount: paragraphs.length
          }
        }
      }));
    } finally {
      inFlightIdsRef.current.delete(chapterId);
      setCheckingMap((current) => ({
        ...current,
        [chapterId]: false
      }));
    }
  }

  async function analyzeChapterWithAi(chapterId: string, chapter: ChapterDraft) {
    if (inFlightIdsRef.current.has(chapterId)) {
      return;
    }

    inFlightIdsRef.current.add(chapterId);
    setCheckingMap((current) => ({
      ...current,
      [chapterId]: true
    }));

    try {
      // 直接使用 requestDraft 函数来生成内容，而不是使用 AiOrchestrator
      const result = await requestDraft(
        `请为论文《${projectTitle}》的“${chapter.title}”章节生成正式草稿。
要求：
1. 保留章节目标：${chapter.goal}
2. 结合当前章节摘要：${chapter.summary}
3. 语气像 ${venueProfile.name} 对应的会议论文，不要空泛
4. 不编造参考文献
5. 只输出正文内容`
      );

      if (!result.ok || !result.content) {
        throw new Error(result.error ?? "AI 分析失败");
      }

      // 更新内容
      const nextParagraphs = result.content
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean);

      setDraftMap((current) => ({
        ...current,
        [chapterId]: nextParagraphs.length > 0 ? nextParagraphs : [result.content]
      }));

      setMessage(`AI 已完成对“${chapter.title}”的内容生成。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 分析失败。";
      setMessage(`AI 分析失败：${message}`);
    } finally {
      inFlightIdsRef.current.delete(chapterId);
      setCheckingMap((current) => ({
        ...current,
        [chapterId]: false
      }));
    }
  }

  useEffect(() => {
    if (aiAnalysisMap[activeChapter.id] || checkingMap[activeChapter.id]) {
      return;
    }

    void analyzeChapterWithAi(activeChapter.id, activeChapter);
  }, [activeChapter, checkingMap, aiAnalysisMap]);

  useEffect(() => {
    let cancelled = false;

    async function runQueue() {
      for (const chapter of chapters) {
        if (cancelled) {
          return;
        }

        if (aiAnalysisMap[chapter.id] || inFlightIdsRef.current.has(chapter.id)) {
          continue;
        }

        await analyzeChapterWithAi(chapter.id, chapter);
      }
    }

    void runQueue();

    return () => {
      cancelled = true;
    };
  }, [chapters, aiAnalysisMap]);

  function regenerateCurrentChapter() {
    startTransition(async () => {
      setMessage(`正在重写“${activeChapter.title}”...`);

      try {
        const context: AiTaskContext = {
          projectId,
          projectTitle,
          venueId: venueProfile.id,
          currentStep: "chapter_writing",
          previousSteps: [],
          userInputs: {
            chapterId: activeChapter.id,
            chapterTitle: activeChapter.title,
            chapterGoal: activeChapter.goal,
            chapterSummary: activeChapter.summary,
            currentContent: (draftMap[activeChapter.id] ?? activeChapter.paragraphs).join("\n\n"),
            regenerate: true
          }
        };

        const result = await AiOrchestrator.runTask("chapter_writing", context);
        
        // 更新内容
        const nextParagraphs = result.content.content
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        setDraftMap((current) => ({
          ...current,
          [activeChapter.id]: nextParagraphs.length > 0 ? nextParagraphs : [result.content.content]
        }));

        // 生成改稿意见
        const revisionSuggestions = await AiOrchestrator.generateRevisionSuggestions(
          result.content.content,
          result.quality,
          context
        );

        setAiAnalysisMap((current) => ({
          ...current,
          [activeChapter.id]: {
            ...result,
            revisionSuggestions
          }
        }));

        setMessage(`“${activeChapter.title}”已经重写完成，AI 已完成深度分析。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "重写失败，请稍后再试。";
        setMessage(message);
      }
    });
  }

  function applyCustomInstruction() {
    if (!customInstruction.trim()) {
      setMessage("先写一句你的修改要求，再让 AI 按这个方向改。");
      return;
    }

    startTransition(async () => {
      setMessage(`正在按你的要求修改“${activeChapter.title}”...`);

      try {
        const context: AiTaskContext = {
          projectId,
          projectTitle,
          venueId: venueProfile.id,
          currentStep: "chapter_writing",
          previousSteps: [],
          userInputs: {
            chapterId: activeChapter.id,
            chapterTitle: activeChapter.title,
            chapterGoal: activeChapter.goal,
            chapterSummary: activeChapter.summary,
            currentContent: activeParagraphs.join("\n\n"),
            customInstruction: customInstruction
          }
        };

        const result = await AiOrchestrator.runTask("revision_suggestions", context);
        
        // 更新内容
        const nextParagraphs = result.content.content
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        setDraftMap((current) => ({
          ...current,
          [activeChapter.id]: nextParagraphs.length > 0 ? nextParagraphs : [result.content.content]
        }));

        // 生成改稿意见
        const revisionSuggestions = await AiOrchestrator.generateRevisionSuggestions(
          result.content.content,
          result.quality,
          context
        );

        setAiAnalysisMap((current) => ({
          ...current,
          [activeChapter.id]: {
            ...result,
            revisionSuggestions
          }
        }));

        setMessage("已经按你的要求更新当前章节，AI 已完成深度分析。");
      } catch (error) {
        const message = error instanceof Error ? error.message : "按要求修改失败。";
        setMessage(message);
      }
    });
  }

  async function archiveCurrentChapter() {
    const localRecord = archiveCurrent({
      key: activeArchiveKey,
      fingerprint: activeFingerprint,
      title: activeChapter.title,
      summary: shortenArchiveText(`共 ${activeParagraphs.length} 段；${activeParagraphs.join(" ")}`)
    });

    setMessage(`正在把“${activeChapter.title}”写入服务端版本记录...`);

    try {
      const version = await saveVersion({
        key: activeArchiveKey,
        fingerprint: activeFingerprint,
        title: activeChapter.title,
        summary: shortenArchiveText(`共 ${activeParagraphs.length} 段；${activeParagraphs.join(" ")}`),
        payload: {
          type: "chapter",
          chapterId: activeChapter.id,
          paragraphs: activeParagraphs
        }
      });

      upsertRecord({
        ...localRecord,
        archivedAt: version.createdAt
      });
      setMessage(`已确认并同步到服务端版本记录：“${activeChapter.title}”现在有了可回滚版本。后面如果你继续重写，这里会明确提示当前内容已经和存档不一致。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "服务端版本保存失败，但本地确认状态已保留。");
    }
  }

  function restoreVersion(version: (typeof versions)[number]) {
    const restoredKey = `chapter:${version.payload.chapterId}`;
    const restoredChapter =
      chapters.find((chapter) => chapter.id === version.payload.chapterId) ?? activeChapter;

    setActiveId(version.payload.chapterId);
    setDraftMap((current) => ({
      ...current,
      [version.payload.chapterId]: version.payload.paragraphs
    }));
    upsertRecord({
      key: restoredKey,
      fingerprint: version.fingerprint,
      title: version.title,
      summary: version.summary,
      archivedAt: version.createdAt
    });
    setMessage(`已恢复“${restoredChapter.title}”的历史版本。你现在看到的是之前确认过的正文，可以继续修改，也可以直接再次存档。`);
    void runChapterCheck(
      version.payload.chapterId,
      version.payload.paragraphs,
      restoredChapter.goal,
      restoredChapter.title
    );
  }

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">当前进度</span>
          <h3>一次只处理一章，处理完再进入下一章。</h3>
        </div>
        <p className="lead-text">
          这一页现在会先突出当前章节和整体存档进度，再把正文、改写、自检、补证据这些动作按顺序摆好。手机上不用在左右两栏之间来回切。
        </p>
        <div className="section-ribbon top-gap">
          <span>当前章节：{activeChapter.title}</span>
          <span>
            已存档 {archivedChapterCount}/{chapters.length} 章
          </span>
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">先选章节</span>
          <h3>当前只专注处理一章</h3>
        </div>
        <div className="chapter-menu chapter-menu--carousel">
        {chapters.map((chapter, index) => {
          const isActive = chapter.id === activeChapter.id;
          const chapterParagraphs = draftMap[chapter.id] ?? chapter.paragraphs;
          const chapterArchiveKey = `chapter:${chapter.id}`;
          const hasArchive = Boolean(getRecord(chapterArchiveKey));
          const isCurrentArchived = matchesCurrent(
            chapterArchiveKey,
            createArchiveFingerprint(chapterParagraphs)
          );
          const statusLabel = chapterArchiveLabel(chapter, hasArchive, isCurrentArchived);

          return (
            <button
              key={chapter.id}
              className={isActive ? "chapter-menu__item chapter-menu__item--active" : "chapter-menu__item"}
              onClick={() => setActiveId(chapter.id)}
              type="button"
            >
              <div className="line-item__head">
                <strong>
                  {index + 1}. {chapter.title}
                </strong>
                <StatusBadge tone={chapterArchiveTone(chapter, hasArchive, isCurrentArchived)}>
                  {statusLabel}
                </StatusBadge>
              </div>
              <p>{chapter.summary}</p>
              <div className="chapter-menu__meta">
                {checkingMap[chapter.id] ? (
                  <StatusBadge tone="default">AI 检查中</StatusBadge>
                ) : reviewMap[chapter.id] ? (
                  <StatusBadge tone={toneFromReview(reviewMap[chapter.id]?.overall)}>
                    {reviewMap[chapter.id]?.overall}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="default">待检查</StatusBadge>
                )}
                <span>
                  约{" "}
                  {(reviewMap[chapter.id]?.metrics.charCount ??
                    (draftMap[chapter.id] ?? chapter.paragraphs).join("").replace(/\s+/g, "").length)}
                  {" "}字
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">正文处理</span>
          <h3>{activeChapter.title}</h3>
        </div>
        <div className="hint-panel anchor-section" id="chapter-goal">
          <strong>本章目标</strong>
          <p>{activeChapter.goal}</p>
        </div>

        <div className="button-row top-gap">
          <button className="primary-button" onClick={regenerateCurrentChapter} type="button">
            {isPending ? "生成中..." : "重写本章"}
          </button>
        </div>

        <div className="editor-surface anchor-section" id="chapter-editor">
          {activeParagraphs.map((paragraph, index) => (
            <p key={`${activeChapter.id}-${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="content-card content-card--soft anchor-section" id="chapter-instruction">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">你可以直接发修改指令</span>
          <h3>别对着空白页想，哪里不顺就直接提要求</h3>
        </div>
        <div className="field field--full">
          <textarea
            onChange={(event) => setCustomInstruction(event.target.value)}
            placeholder="例如：把这一章写得更像方法章，补清测试对象与评价维度，不要再写空话。"
            rows={3}
            value={customInstruction}
          />
        </div>
        <div className="button-row top-gap">
          <button className="secondary-button" onClick={applyCustomInstruction} type="button">
            按我的要求改这一章
          </button>
        </div>
      </section>

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">AI 备选写法</span>
            <h3>不给空框，直接给你 2 条备选建议</h3>
          </div>
          <div className="stack-list">
            {activeChapter.aiOptions.map((item) => (
              <div key={item} className="line-item line-item--column">
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="content-card anchor-section" id="chapter-evidence">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">还缺什么</span>
            <h3>本章需要你补的证据点</h3>
          </div>
          <ul className="bullet-list">
            {activeChapter.evidenceNeeds.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <QualityReviewPanel
        actionContext={{
          activeChapterId: activeChapter.id,
          projectId,
          scope: "chapter",
          sections: chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title
          })),
          venueId
        }}
        emptyText="本章生成后，系统会自动检查长度、结构、学术表达和会议适配度。"
        loading={Boolean(checkingMap[activeChapter.id])}
        report={reviewMap[activeChapter.id] ?? null}
        title="本章 AI 自检"
      />

      <div className="hint-panel">
        <strong>系统反馈</strong>
        <p>{message}</p>
      </div>

      <ArchiveActionPanel
        archiveLabel="确认并存档当前章节"
        archivedAt={activeArchiveRecord?.archivedAt}
        archivedSummary={
          activeArchiveRecord
            ? `${activeArchiveRecord.title}：${activeArchiveRecord.summary}`
            : undefined
        }
        currentLabel="当前将被锁定的章节版本"
        currentSummary={`当前正文共 ${activeParagraphs.length} 段；开头内容：${shortenArchiveText(
          activeParagraphs[0] ?? "暂无正文"
        )}`}
        description="章节页最需要这个动作，因为这里改动最频繁。你一旦确认并存档，后面继续重写也不会把已经定下来的版本冲掉。"
        helperText={
          allChaptersArchived
            ? "所有章节都已经有确认节点了。现在去看全文时，系统至少知道自己该整合哪一套稳定版本。"
            : `还需再存档 ${chapters.length - archivedChapterCount} 章，全文整合才会真正建立在已确认内容上。`
        }
        archiveDisabled={saving}
        isCurrentArchived={isActiveArchived}
        onArchive={archiveCurrentChapter}
        secondaryAction={
          isReady && allChaptersArchived ? (
            <Link
              className="primary-button"
              href={buildVenueHref(`/projects/${projectId}/export`, venueId)}
            >
              所有章节已存档，去看完整全文
            </Link>
          ) : (
            <button className="secondary-button" disabled type="button">
              {isReady
                ? `还需存档 ${chapters.length - archivedChapterCount} 章后再进入全文预览`
                : "正在读取本地存档..."}
            </button>
          )
        }
        title="这一章定下来后，要留一个可回退的版本节点"
      />

      <VersionHistoryPanel
        currentFingerprint={activeFingerprint}
        description="这里保存的是当前章节曾经确认过的正文版本。回滚后，系统会把这一版正文重新放回编辑区，并重新跑一次自检。"
        error={historyError}
        loading={historyLoading}
        onRestore={restoreVersion}
        title={`${activeChapter.title} 的历史记录`}
        versions={versions}
      />
    </div>
  );
}
