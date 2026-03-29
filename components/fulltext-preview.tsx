"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import type { FullTextSection } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
import { useProjectVersionHistory } from "@/lib/project-version-client";
import type { FullTextVersionPayload } from "@/lib/project-version-types";
import type { AiQualityReport } from "@/lib/quality-check";
import type { VenueProfile } from "@/lib/venue-profiles";

type FullTextPreviewProps = {
  projectId: string;
  projectTitle: string;
  abstract: string;
  keywords: string[];
  sections: FullTextSection[];
  venueProfile: VenueProfile;
};

type DraftResponse = {
  ok: boolean;
  content?: string;
  error?: string;
};

type CheckResponse = {
  ok: boolean;
  error?: string;
} & AiQualityReport;

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

async function requestCheck(input: {
  title: string;
  content: string;
  venueId: string;
}) {
  const response = await fetch("/api/ai/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target: "fulltext",
      title: input.title,
      content: input.content,
      venueId: input.venueId
    })
  });

  return (await response.json()) as CheckResponse;
}

export function FullTextPreview({
  projectId,
  projectTitle,
  abstract,
  keywords,
  sections,
  venueProfile
}: FullTextPreviewProps) {
  const [generatedPreview, setGeneratedPreview] = useState("");
  const [message, setMessage] = useState("全文已经合成出来了，你可以先看完整稿，再决定是否确认并存档这一版。");
  const [review, setReview] = useState<AiQualityReport | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { archiveCurrent, getRecord, matchesCurrent, upsertRecord } = useProjectArchive(projectId);
  const sectionDigest = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        title: section.title,
        paragraphCount: section.content.filter(Boolean).length,
        preview: section.content[0] ?? "这一章正在等待正文整合。"
      })),
    [sections]
  );

  const currentFullText = useMemo(() => {
    if (generatedPreview) {
      return generatedPreview;
    }

    return [
      `题目：${projectTitle}`,
      `摘要：${abstract}`,
      `关键词：${keywords.join("、")}`,
      ...sections.map((section) => `${section.title}\n${section.content.join("\n\n")}`)
    ].join("\n\n");
  }, [abstract, generatedPreview, keywords, projectTitle, sections]);
  const charCount = currentFullText.replace(/\s+/g, "").length;
  const paragraphCount = currentFullText.split(/\n{2,}/).filter(Boolean).length;
  const archiveKey = "fulltext";
  const currentFingerprint = createArchiveFingerprint([currentFullText]);
  const archiveRecord = getRecord(archiveKey);
  const isCurrentArchived = matchesCurrent(archiveKey, currentFingerprint);
  const {
    error: historyError,
    loading: historyLoading,
    saveVersion,
    saving,
    versions
  } = useProjectVersionHistory<FullTextVersionPayload>(projectId, archiveKey);

  const runFullTextCheck = useCallback(async (content: string) => {
    setReviewLoading(true);

    try {
      const result = await requestCheck({
        title: projectTitle,
        content,
        venueId: venueProfile.id
      });

      if (!result.ok) {
        throw new Error(result.error ?? "全文自检失败");
      }

      setReview({
        overall: result.overall,
        summary: result.summary,
        checks: result.checks,
        rewritePriorities: result.rewritePriorities,
        metrics: result.metrics
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "全文自检失败。";

      setReview({
        overall: "建议修改",
        summary: "当前未能拿到完整全文自检结果",
        checks: [
          {
            dimension: "自检链路",
            level: "建议修改",
            detail: message
          }
        ],
        rewritePriorities: ["稍后重新运行全文自检"],
        metrics: {
          charCount: content.replace(/\s+/g, "").length,
          paragraphCount: content.split(/\n{2,}/).filter(Boolean).length
        }
      });
    } finally {
      setReviewLoading(false);
    }
  }, [projectTitle, venueProfile.id]);

  useEffect(() => {
    if (review) {
      return;
    }

    void runFullTextCheck(currentFullText);
  }, [currentFullText, review, runFullTextCheck]);

  function regeneratePreview() {
    startTransition(async () => {
      setMessage("正在基于大纲生成全文...");

      const outlineContent = sectionDigest
        .map((item) => `${item.title}\n段落数：${item.paragraphCount}\n内容摘要：${item.preview}`)
        .join("\n\n");

      const result = await requestDraft(
        `请根据下面的论文信息和大纲，为《${projectTitle}》生成一版符合EI发表要求的中文全文。
要求：
1. 严格按照大纲结构生成内容，确保每个章节都有详细的论述
2. 保持正式 ${venueProfile.name} 会议论文口吻，学术表达克制，避免夸张和主观判断
3. 内容详尽，提供充分的分析和论证
4. 不编造参考文献
5. 符合EI会议的学术标准，结构清晰，逻辑严谨
6. 只输出全文正文，包括摘要、关键词和各个章节

会议规则：
${venueProfile.template}
${venueProfile.abstractRule}
${venueProfile.keywordRule}
${venueProfile.pageRule}
${venueProfile.referenceRule}

摘要：
${abstract}

关键词：
${keywords.join("、")}

大纲：
${outlineContent}`
      );

      if (!result.ok || !result.content) {
        setMessage(result.error ?? "全文生成失败。");
        return;
      }

      setGeneratedPreview(result.content);
      setMessage("已经基于大纲生成出一版符合EI要求的全文，正在自动自检。");
      await runFullTextCheck(result.content);
    });
  }

  async function archiveCurrentFullText() {
    const localRecord = archiveCurrent({
      key: archiveKey,
      fingerprint: currentFingerprint,
      title: projectTitle,
      summary: shortenArchiveText(currentFullText, 100)
    });

    setMessage("正在把当前全文写入服务端版本记录...");

    try {
      const version = await saveVersion({
        key: archiveKey,
        fingerprint: currentFingerprint,
        title: projectTitle,
        summary: shortenArchiveText(currentFullText, 100),
        payload: {
          type: "fulltext",
          generatedPreview
        }
      });

      upsertRecord({
        ...localRecord,
        archivedAt: version.createdAt
      });
      setMessage("已确认并同步到服务端版本记录。这一版现在已经有明确的定稿节点，后面继续整合或润色也不会把它冲掉。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "服务端版本保存失败，但本地确认状态已保留。");
    }
  }

  function restoreVersion(version: (typeof versions)[number]) {
    setGeneratedPreview(version.payload.generatedPreview);
    upsertRecord({
      key: archiveKey,
      fingerprint: version.fingerprint,
      title: version.title,
      summary: version.summary,
      archivedAt: version.createdAt
    });
    setMessage("已恢复到之前确认过的全文版本。你现在看到的是服务端历史里保存过的完整稿。");
    void runFullTextCheck(
      version.payload.generatedPreview || [
        `题目：${projectTitle}`,
        `摘要：${abstract}`,
        `关键词：${keywords.join("、")}`,
        ...sections.map((section) => `${section.title}\n${section.content.join("\n\n")}`)
      ].join("\n\n")
    );
  }

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent stitch-panel">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">完整全文预览</span>
          <h3>先通读这一版，再决定要不要定稿</h3>
        </div>
        <div className="selection-spotlight top-gap">
          <div>
            <span className="selection-spotlight__label">当前稿件</span>
            <strong>{projectTitle}</strong>
            <p>
              当前约 {charCount} 字，关键词 {keywords.length} 个。
            </p>
          </div>
          <span className="ghost-chip ghost-chip--accent">{venueProfile.shortName}</span>
        </div>
        <div className="decision-metrics top-gap">
          <div className="decision-metric">
            <span>章节数</span>
            <strong>{sections.length}</strong>
            <p>定稿前先确认全篇结构有没有断层。</p>
          </div>
          <div className="decision-metric">
            <span>段落数</span>
            <strong>{paragraphCount}</strong>
            <p>太少通常说明论证层次还不够完整。</p>
          </div>
          <div className="decision-metric">
            <span>版本状态</span>
            <strong>{isCurrentArchived ? "已定稿留档" : "尚未确认定稿"}</strong>
            <p>导出前最好先把当前全文锁成一个正式版本。</p>
          </div>
        </div>
        <div className="button-row top-gap">
          <button className="secondary-button" onClick={regeneratePreview} type="button">
            {isPending ? "整合中..." : "重新整合全文"}
          </button>
        </div>
        <div className="hint-panel top-gap">
          <strong>系统反馈</strong>
          <p>{message}</p>
        </div>
      </section>

      <div className="fulltext-review-grid">
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">预览正文</span>
            <h3>先看稿，再决定是否继续处理</h3>
          </div>
          {generatedPreview ? (
            <div className="editor-surface fulltext-surface">
              <p>{generatedPreview}</p>
            </div>
          ) : (
            <div className="editor-surface fulltext-surface">
              <h4>题目</h4>
              <p>{projectTitle}</p>
              <h4>摘要</h4>
              <p>{abstract}</p>
              <h4>关键词</h4>
              <p>{keywords.join("、")}</p>
              {sections.map((section) => (
                <div key={section.id} className="paper-preview-block">
                  <h4>{section.title}</h4>
                  {section.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="fulltext-review-rail">
          <QualityReviewPanel
            actionContext={{
              scope: "fulltext",
              projectId,
              sections: sections.map((section) => ({
                id: section.id,
                title: section.title
              })),
              venueId: venueProfile.id
            }}
            emptyText="全文合成后，系统会自动检查长度、结构一致性和会议适配度。"
            loading={reviewLoading}
            report={review}
            title="全文 AI 自检"
          />

          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">章节清单</span>
              <h3>定稿时先看哪几章最可能出问题</h3>
            </div>
            <div className="stack-list">
              {sectionDigest.map((item) => (
                <div key={item.id} className="line-item line-item--column">
                  <div className="line-item__head">
                    <strong>{item.title}</strong>
                    <span>{item.paragraphCount} 段</span>
                  </div>
                  <p>{item.preview}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">会议约束</span>
              <h3>导出前最后再对一遍投稿规则</h3>
            </div>
            <div className="stack-list">
              <div className="line-item line-item--column">
                <strong>摘要要求</strong>
                <p>{venueProfile.abstractRule}</p>
              </div>
              <div className="line-item line-item--column">
                <strong>关键词要求</strong>
                <p>{venueProfile.keywordRule}</p>
              </div>
              <div className="line-item line-item--column">
                <strong>篇幅与参考文献</strong>
                <p>{venueProfile.pageRule}；{venueProfile.referenceRule}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ArchiveActionPanel
        archiveLabel="确认并存档当前全文"
        archivedAt={archiveRecord?.archivedAt}
        archivedSummary={archiveRecord ? `${archiveRecord.title}：${archiveRecord.summary}` : undefined}
        currentLabel="当前将被锁定的全文版本"
        currentSummary={`当前全文约 ${charCount} 字；开头内容：${shortenArchiveText(
          currentFullText
        )}`}
        description="全文页也必须有确认并存档。否则你每次重新整合一版，都不知道哪一版才是真正准备拿去导出或交付的版本。"
        helperText={
          isCurrentArchived
            ? "这一版全文已经留下稳定记录，后面继续整合时如果内容变了，这里会立刻提醒你当前版本还没重新存档。"
            : "先确认并存档，再把这一版当成导出基线。这样后面做格式化、导出 Word 或 PDF 时，取到的就是你真的点头过的版本。"
        }
        archiveDisabled={saving}
        isCurrentArchived={isCurrentArchived}
        onArchive={archiveCurrentFullText}
        title="全文不是看看就算，要明确留下这一版定稿"
      />

      <VersionHistoryPanel
        currentFingerprint={currentFingerprint}
        description="这里保存的是你正式确认过的完整稿。回滚后，全文区会直接恢复到那次存档的内容，并重新进行全文自检。"
        error={historyError}
        loading={historyLoading}
        onRestore={restoreVersion}
        title="全文历史记录"
        versions={versions}
      />
    </div>
  );
}
