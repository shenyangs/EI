"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import { StatusBadge } from "@/components/status-badge";
import type { ChapterDraft } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
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
  venueId
}: ChapterWritingStudioProps) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "");
  const [message, setMessage] = useState("每一章先给你正文，再允许你局部重写。");
  const [customInstruction, setCustomInstruction] = useState("");
  const [draftMap, setDraftMap] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter.paragraphs]))
  );
  const [reviewMap, setReviewMap] = useState<Record<string, AiQualityReport | null>>({});
  const [checkingMap, setCheckingMap] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const inFlightIdsRef = useRef(new Set<string>());
  const { archiveCurrent, getRecord, isReady, matchesCurrent } = useProjectArchive(projectId);

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

  useEffect(() => {
    if (reviewMap[activeChapter.id] || checkingMap[activeChapter.id]) {
      return;
    }

    void runChapterCheck(
      activeChapter.id,
      activeParagraphs,
      activeChapter.goal,
      activeChapter.title
    );
  }, [activeChapter, activeParagraphs, checkingMap, reviewMap]);

  useEffect(() => {
    let cancelled = false;

    async function runQueue() {
      for (const chapter of chapters) {
        if (cancelled) {
          return;
        }

        if (reviewMap[chapter.id] || inFlightIdsRef.current.has(chapter.id)) {
          continue;
        }

        const paragraphs = draftMap[chapter.id] ?? chapter.paragraphs;

        await runChapterCheck(chapter.id, paragraphs, chapter.goal, chapter.title);
      }
    }

    void runQueue();

    return () => {
      cancelled = true;
    };
  }, [chapters, draftMap, reviewMap]);

  function regenerateCurrentChapter() {
    startTransition(async () => {
      setMessage(`正在重写“${activeChapter.title}”...`);

      const result = await requestDraft(
        `请为论文《${projectTitle}》的“${activeChapter.title}”章节生成 3 段正式草稿。
要求：
1. 保留章节目标：${activeChapter.goal}
2. 结合当前章节摘要：${activeChapter.summary}
3. 语气像 ${venueProfile.name} 对应的会议论文，不要空泛
4. 不编造参考文献
5. 只输出正文内容`
      );

      if (!result.ok || !result.content) {
        setMessage(result.error ?? "重写失败，请稍后再试。");
        return;
      }

      const nextParagraphs = result.content
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean);

      setDraftMap((current) => ({
        ...current,
        [activeChapter.id]: nextParagraphs.length > 0 ? nextParagraphs : [result.content!]
      }));
      setMessage(`“${activeChapter.title}”已经重写完成，正在自动自检。`);
      await runChapterCheck(
        activeChapter.id,
        nextParagraphs.length > 0 ? nextParagraphs : [result.content!],
        activeChapter.goal,
        activeChapter.title
      );
    });
  }

  function applyCustomInstruction() {
    if (!customInstruction.trim()) {
      setMessage("先写一句你的修改要求，再让 AI 按这个方向改。");
      return;
    }

    startTransition(async () => {
      setMessage(`正在按你的要求修改“${activeChapter.title}”...`);

      const result = await requestDraft(
        `请修改论文《${projectTitle}》的“${activeChapter.title}”章节。
当前章节目标：${activeChapter.goal}
当前会议规则：${venueProfile.name}；摘要规则：${venueProfile.abstractRule}；篇幅规则：${venueProfile.pageRule}；引用规则：${venueProfile.referenceRule}
用户要求：${customInstruction}
当前内容：
${activeParagraphs.join("\n\n")}

要求：
1. 保留章节逻辑
2. 明显响应用户要求
3. 只输出修改后的正文`
      );

      if (!result.ok || !result.content) {
        setMessage(result.error ?? "按要求修改失败。");
        return;
      }

      const nextParagraphs = result.content
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean);

      setDraftMap((current) => ({
        ...current,
        [activeChapter.id]: nextParagraphs.length > 0 ? nextParagraphs : [result.content!]
      }));
      setMessage("已经按你的要求更新当前章节，正在自动自检。");
      await runChapterCheck(
        activeChapter.id,
        nextParagraphs.length > 0 ? nextParagraphs : [result.content!],
        activeChapter.goal,
        activeChapter.title
      );
    });
  }

  function archiveCurrentChapter() {
    archiveCurrent({
      key: activeArchiveKey,
      fingerprint: activeFingerprint,
      title: activeChapter.title,
      summary: shortenArchiveText(`共 ${activeParagraphs.length} 段；${activeParagraphs.join(" ")}`)
    });
    setMessage(`已确认并存档“${activeChapter.title}”。后面如果你继续重写，这里会明确提示“当前内容有新改动”，不会再让你分不清哪一版才算定稿。`);
  }

  return (
    <div className="chapter-studio">
      <div className="chapter-menu">
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

      <div className="chapter-panel">
        <div className="section-ribbon">
          <span>当前章节：{activeChapter.title}</span>
          <span>
            已存档 {archivedChapterCount}/{chapters.length} 章
          </span>
        </div>

        <div className="hint-panel">
          <strong>本章目标</strong>
          <p>{activeChapter.goal}</p>
        </div>

        <div className="button-row top-gap">
          <button className="primary-button" onClick={regenerateCurrentChapter} type="button">
            {isPending ? "生成中..." : "重写本章"}
          </button>
        </div>

        <div className="editor-surface">
          {activeParagraphs.map((paragraph, index) => (
            <p key={`${activeChapter.id}-${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </div>

        <div className="content-card content-card--soft top-gap">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">你可以直接发修改指令</span>
            <h3>别再让你对着空壳发呆，哪里不顺就直接改哪里</h3>
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
        </div>

        <div className="project-page-grid top-gap">
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

          <section className="content-card">
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

        <div className="top-gap">
          <QualityReviewPanel
            emptyText="本章生成后，系统会自动检查长度、结构、学术表达和会议适配度。"
            loading={Boolean(checkingMap[activeChapter.id])}
            report={reviewMap[activeChapter.id] ?? null}
            title="本章 AI 自检"
          />
        </div>

        <div className="hint-panel top-gap">
          <strong>系统反馈</strong>
          <p>{message}</p>
        </div>

        <div className="top-gap">
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
        </div>
      </div>
    </div>
  );
}
