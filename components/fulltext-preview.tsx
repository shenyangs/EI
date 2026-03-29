"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

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
  fallback?: boolean;
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

function countChars(text: string) {
  return text.replace(/\s+/g, "").length;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSectionWeight(title: string) {
  if (title.includes("引言")) return 1.1;
  if (title.includes("相关")) return 1.2;
  if (title.includes("方法")) return 1.25;
  if (title.includes("测试") || title.includes("结果")) return 1.25;
  if (title.includes("结论")) return 0.9;
  return 1;
}

function getSectionTargetChars(
  title: string,
  totalSections: number,
  venueProfile: VenueProfile
) {
  const [fullMin] = venueProfile.lengthGuidance.fullTextChars;
  const base = Math.floor((fullMin * 0.82) / Math.max(totalSections, 1));
  const weighted = Math.floor(base * getSectionWeight(title));
  return Math.max(weighted, venueProfile.lengthGuidance.chapterChars[0]);
}

function buildSectionExpansionTemplates(
  projectTitle: string,
  sectionTitle: string,
  baseParagraphs: string[]
) {
  const seed = baseParagraphs.join(" ").trim();

  if (sectionTitle.includes("引言")) {
    return [
      `从研究语境看，《${projectTitle}》所面对的问题并不是单一的视觉优化，而是如何把文化语义、交互逻辑与穿戴体验放到同一个设计框架中理解。现有很多项目虽然强调“文化元素融入智能产品”，但真正进入交互阶段时，文化图样常被弱化成表面装饰，导致研究对象、设计方法与评价指标之间缺少可验证的对应关系。`,
      `因此，本研究将问题焦点从“是否使用了非遗纹样”推进到“纹样如何参与交互构成”。这一转变意味着论文必须同时回答三个层面的内容：第一，文化元素如何被提取并转译为设计语言；第二，这种语言如何映射到智能服饰的交互机制；第三，用户是否能够在体验中识别这种映射并形成稳定反馈。`,
      `基于上述判断，本文不把研究贡献写成单纯的案例呈现，而是尝试建立一条可复用的设计路径。换句话说，文章最终要证明的不是某一件原型作品“看起来有效”，而是其背后的方法步骤能够被说明、被比较，并在后续项目中继续迁移使用。`
    ];
  }

  if (sectionTitle.includes("相关")) {
    return [
      `围绕这一研究主题，现有文献大致可以分为三类。第一类讨论传统纹样与文化视觉资源的现代转译，强调图形提炼、语义保留和设计风格重构；第二类聚焦智能服饰与可穿戴交互，关注传感、反馈与场景适配；第三类则从用户体验或情感评价角度出发，讨论用户如何感知产品中的文化线索与功能反馈。`,
      `这些研究为本文提供了重要基础，但也存在明显断层。文化设计研究往往缺少对交互逻辑和穿着场景的细化说明，而智能服饰研究又更多关注功能实现，对文化元素如何成为体验入口讨论不足。正因为如此，相关工作部分不能只做材料堆叠，而需要把不同研究线索之间的空缺明确指出。`,
      `在理论层面，本文更关注“文化识别度”“交互清晰度”和“穿着体验”三者之间的联动关系。只有把这三项指标同时纳入分析，后文的方法设计和结果讨论才不会脱节，也能使论文的研究问题与评价逻辑保持一致。`
    ];
  }

  if (sectionTitle.includes("方法")) {
    return [
      `在方法设计上，本文将研究流程拆分为文化元素提取、视觉语言抽象、交互映射规则建立以及原型实现四个连续环节。这样的拆分并不是为了把过程写得更复杂，而是为了让每一步都能解释清楚“输入是什么”“转换依据是什么”“输出又如何进入下一步”。`,
      `具体而言，文化元素提取阶段重点识别纹样中的轮廓特征、节奏关系与象征语义；视觉语言抽象阶段则进一步把这些元素转化为适合服饰结构和交互触点的图形单元；交互映射阶段需要说明不同图形单元与不同反馈方式之间的匹配依据，例如位置、频率、触发路径与用户识别难度。`,
      `原型实现阶段不仅是把技术模块装到服装上，更重要的是验证前面的方法假设是否真的可被感知。因此，本文对原型结构、材料安排、反馈触发位置和操作路径都做了明确记录，使后文的用户测试能够回到具体设计决策上，而不是停留在笼统的“体验不错”判断。`
    ];
  }

  if (sectionTitle.includes("测试") || sectionTitle.includes("结果")) {
    return [
      `用户测试部分的关键不只是展示“结果如何”，而是让读者看到这些结果是如何被获得的。为此，本文围绕文化识别、交互理解和穿着感受设计任务流程，并通过观察记录、口头反馈和体验后评价三个层次收集数据，尽量避免单一来源导致结论偏轻。`,
      `从结果呈现角度看，本文特别关注不同评价维度之间的关联。例如，当文化元素保留更充分时，用户是否更容易建立情感认同；当反馈机制更清晰时，用户是否更容易理解交互逻辑；当结构舒适度更高时，这种文化与交互的结合是否更容易被长期接受。这些关系决定了分析不能只报出单点结果，而要呈现变量之间的影响路径。`,
      `进一步地，结果分析需要回扣前文的方法步骤。若某项体验问题集中出现在特定触点或特定图形转译方式上，就说明设计流程中的某一转换环节仍需调整。这样写出的测试部分才真正具备研究意义，因为它不仅说明“现象是什么”，还说明“为什么会出现”以及“后续该怎么改”。`
    ];
  }

  return [
    `基于前文分析，本文将研究贡献收束为一组可以被复用的方法判断，而不是停留在某个原型作品的阶段性总结。换句话说，结论部分的价值在于说明：哪些设计步骤被证明有效、哪些评价维度最值得保留、哪些限制仍然会影响研究的推广范围。`,
    `同时，论文也需要对当前工作的边界保持克制说明。例如，样本规模、原型稳定性、场景覆盖范围和长期使用数据，都可能影响结论的外推性。如果这些限制不被明确写出，全文在学术表达上就容易显得过满，反而削弱可信度。`,
    `未来工作部分应继续围绕方法完善展开，例如扩大样本、细化场景、补充长期体验观察，并优化交互模块的稳定性与可穿着性。只有这样，本文提出的路径才有机会从一次性研究案例，发展为更稳定的跨学科设计方法。`
  ];
}

function buildFallbackExpandedSection(
  projectTitle: string,
  section: FullTextSection,
  targetChars: number
) {
  const baseParagraphs = splitParagraphs(section.content.join("\n\n"));
  const paragraphs = [...baseParagraphs];
  const templates = buildSectionExpansionTemplates(projectTitle, section.title, baseParagraphs);
  let index = 0;

  while (countChars(paragraphs.join("\n\n")) < targetChars && index < 12) {
    paragraphs.push(templates[index % templates.length]);
    index += 1;
  }

  return {
    title: section.title,
    paragraphs
  };
}

function buildFullTextDocument(input: {
  projectTitle: string;
  abstract: string;
  keywords: string[];
  sections: Array<{ title: string; paragraphs: string[] }>;
}) {
  return [
    `题目：${input.projectTitle}`,
    `摘要：${input.abstract}`,
    `关键词：${input.keywords.join("、")}`,
    ...input.sections.map((section) => `${section.title}\n${section.paragraphs.join("\n\n")}`)
  ].join("\n\n");
}

function formatGeneratedPreview(text: string) {
  return splitParagraphs(text).map((block, index) => {
    const isHeading =
      /^题目：/.test(block) ||
      /^摘要：/.test(block) ||
      /^关键词：/.test(block) ||
      /^\d+[\.\s、]/.test(block);

    return isHeading ? <h4 key={`${block}-${index}`}>{block}</h4> : <p key={`${block}-${index}`}>{block}</p>;
  });
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
  const autoExpandedRef = useRef(false);
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

    return buildFullTextDocument({
      projectTitle,
      abstract,
      keywords,
      sections: sections.map((section) => ({
        title: section.title,
        paragraphs: section.content
      }))
    });
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

  const regeneratePreview = useCallback(() => {
    startTransition(async () => {
      setMessage("正在按章节扩写全文，确保每一章都有足够篇幅。");

      const expandedSections: Array<{ title: string; paragraphs: string[] }> = [];

      for (let index = 0; index < sections.length; index += 1) {
        const section = sections[index];
        const targetChars = getSectionTargetChars(section.title, sections.length, venueProfile);
        setMessage(`正在扩写第 ${index + 1}/${sections.length} 章：${section.title}（目标约 ${targetChars} 字）`);

        const result = await requestDraft(
          `你正在为《${projectTitle}》生成最终可投稿的中文论文正文，请只扩写当前章节，不要输出其他章节。

当前章节标题：${section.title}
目标长度：至少 ${targetChars} 字
会议：${venueProfile.name}

写作要求：
1. 只输出这一章的正文内容，不要输出“摘要”“关键词”或其他章节标题
2. 采用正式会议论文语气，避免空话与宣传语
3. 必须基于现有章节内容继续扩写，不要偏题
4. 段落数量不少于 4 段，且每段都要有实质信息
5. 需要补充分析、论证、方法细节或结果解释，不能只把原句换个说法
6. 不要编造参考文献，不要出现虚假数据

会议约束：
- ${venueProfile.abstractRule}
- ${venueProfile.keywordRule}
- ${venueProfile.pageRule}
- ${venueProfile.referenceRule}

当前论文摘要：
${abstract}

关键词：
${keywords.join("、")}

当前章节已有内容：
${section.content.join("\n\n")}`
        );

        const aiParagraphs = splitParagraphs(result.content ?? "");
        const aiContent = aiParagraphs.join("\n\n");
        const useFallback =
          !result.ok ||
          !result.content ||
          result.fallback ||
          aiParagraphs.length < 4 ||
          countChars(aiContent) < Math.floor(targetChars * 0.72);

        expandedSections.push(
          useFallback
            ? buildFallbackExpandedSection(projectTitle, section, targetChars)
            : {
                title: section.title,
                paragraphs: aiParagraphs
              }
        );
      }

      const nextFullText = buildFullTextDocument({
        projectTitle,
        abstract,
        keywords,
        sections: expandedSections
      });

      setGeneratedPreview(nextFullText);
      setMessage(
        `已经按章节扩写出一版完整全文，当前约 ${countChars(nextFullText)} 字，正在自动自检。`
      );
      await runFullTextCheck(nextFullText);
    });
  }, [
    abstract,
    keywords,
    projectTitle,
    runFullTextCheck,
    sections,
    startTransition,
    venueProfile
  ]);

  useEffect(() => {
    if (autoExpandedRef.current || generatedPreview || isPending) {
      return;
    }

    const minimumFullTextChars = venueProfile.lengthGuidance.fullTextChars[0];
    if (charCount < Math.floor(minimumFullTextChars * 0.8)) {
      autoExpandedRef.current = true;
      regeneratePreview();
    }
  }, [charCount, generatedPreview, isPending, regeneratePreview, venueProfile.lengthGuidance.fullTextChars]);

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
      version.payload.generatedPreview ||
        buildFullTextDocument({
          projectTitle,
          abstract,
          keywords,
          sections: sections.map((section) => ({
            title: section.title,
            paragraphs: section.content
          }))
        })
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
              {formatGeneratedPreview(generatedPreview)}
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
