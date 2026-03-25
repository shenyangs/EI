"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import type { FullTextSection } from "@/lib/demo-data";
import {
  createArchiveFingerprint,
  shortenArchiveText,
  useProjectArchive
} from "@/lib/project-archive";
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
  const { archiveCurrent, getRecord, matchesCurrent } = useProjectArchive(projectId);

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
  const archiveKey = "fulltext";
  const currentFingerprint = createArchiveFingerprint([currentFullText]);
  const archiveRecord = getRecord(archiveKey);
  const isCurrentArchived = matchesCurrent(archiveKey, currentFingerprint);

  async function runFullTextCheck(content: string) {
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
  }

  useEffect(() => {
    if (review) {
      return;
    }

    void runFullTextCheck(currentFullText);
  }, [currentFullText, review]);

  function regeneratePreview() {
    startTransition(async () => {
      setMessage("正在重新整合全文...");

      const result = await requestDraft(
        `请根据下面的论文信息，为《${projectTitle}》重新整合一版中文全文预览。
要求：
1. 摘要、引言、方法、结果、结论都要出现
2. 保持正式 ${venueProfile.name} 会议论文口吻
3. 不编造参考文献
4. 只输出全文正文

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

章节信息：
${sections.map((item) => `${item.title}：${item.content.join(" ")}`).join("\n")}`
      );

      if (!result.ok || !result.content) {
        setMessage(result.error ?? "全文整合失败。");
        return;
      }

      setGeneratedPreview(result.content);
      setMessage("已经重新整合出一版全文，正在自动自检。");
      await runFullTextCheck(result.content);
    });
  }

  function archiveCurrentFullText() {
    archiveCurrent({
      key: archiveKey,
      fingerprint: currentFingerprint,
      title: projectTitle,
      summary: shortenArchiveText(currentFullText, 100)
    });
    setMessage("已确认并存档当前全文。这一版现在已经有明确的定稿节点，后面继续整合或润色也不会把它冲掉。");
  }

  return (
    <div className="workbench-stack">
      <div className="button-row">
        <button className="secondary-button" onClick={regeneratePreview} type="button">
          {isPending ? "整合中..." : "重新整合全文"}
        </button>
      </div>

      <div className="hint-panel">
        <strong>系统反馈</strong>
        <p>{message}</p>
      </div>

      <QualityReviewPanel
        emptyText="全文合成后，系统会自动检查长度、结构一致性和会议适配度。"
        loading={reviewLoading}
        report={review}
        title="全文 AI 自检"
      />

      <ArchiveActionPanel
        archiveLabel="确认并存档当前全文"
        archivedAt={archiveRecord?.archivedAt}
        archivedSummary={archiveRecord ? `${archiveRecord.title}：${archiveRecord.summary}` : undefined}
        currentLabel="当前将被锁定的全文版本"
        currentSummary={`当前全文约 ${currentFullText.replace(/\s+/g, "").length} 字；开头内容：${shortenArchiveText(
          currentFullText
        )}`}
        description="全文页也必须有确认并存档。否则你每次重新整合一版，都不知道哪一版才是真正准备拿去导出或交付的版本。"
        helperText={
          isCurrentArchived
            ? "这一版全文已经留下稳定记录，后面继续整合时如果内容变了，这里会立刻提醒你当前版本还没重新存档。"
            : "先确认并存档，再把这一版当成导出基线。这样后面做格式化、导出 Word 或 PDF 时，取到的就是你真的点头过的版本。"
        }
        isCurrentArchived={isCurrentArchived}
        onArchive={archiveCurrentFullText}
        title="全文不是看看就算，要明确留下这一版定稿"
      />

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
    </div>
  );
}
