"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArchiveActionPanel } from "@/components/archive-action-panel";
import { QualityReviewPanel } from "@/components/quality-review-panel";
import { StatusBadge } from "@/components/status-badge";
import { StreamingAiPanel } from "@/components/streaming-ai-panel";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import type { OutlineSection, TitlePackage } from "@/lib/demo-data";
import { buildOutlineFallback, buildOutlineFromContent } from "@/lib/outline-fallback";
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

function buildStatusSummary(outline: OutlineSection[]) {
  return outline.reduce(
    (summary, section) => {
      if (section.status === "已锁定") {
        summary.locked += 1;
      } else if (section.status === "草稿中") {
        summary.drafting += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    { locked: 0, drafting: 0, pending: 0 }
  );
}

const OUTLINE_GENERATION_TIMEOUT_MS = 40000;
function buildGeneratedPackages(projectTitle: string | undefined, abstract: string, keywords?: string[]) {
  return [
    {
      id: "package-1",
      label: "结构主方案",
      title: projectTitle || "研究主题",
      abstract,
      positioning: "基于选定研究方向生成的主框架方案",
      recommendedReason: "结构完整，逻辑顺序清晰，适合作为后续写作基线",
      keywords: keywords && keywords.length > 0 ? keywords : ["研究主题", "研究方法", "创新点"]
    }
  ] satisfies TitlePackage[];
}

export function OutlineWorkbench({
  projectId,
  packages: initialPackages,
  outline: initialOutline,
  venueId,
  selectedDirection,
  projectTitle
}: OutlineWorkbenchProps) {
  const [packages, setPackages] = useState<TitlePackage[]>(initialPackages || []);
  const [outline, setOutline] = useState<OutlineSection[]>(initialOutline || []);
  const [loading, setLoading] = useState(!initialPackages || !initialOutline);
  const [selectedId, setSelectedId] = useState(initialPackages?.[0]?.id ?? "");
  const [customTitle, setCustomTitle] = useState("");
  const [customAbstractNote, setCustomAbstractNote] = useState("");
  const [reviewMap, setReviewMap] = useState<Record<string, AiQualityReport | null>>({});
  const [message, setMessage] = useState("当前框架包已准备好，可继续进入逐章写作。");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, Partial<OutlineSection>>>({});
  const [useStreaming, setUseStreaming] = useState(true);
  const {
    archiveCurrent,
    getRecord,
    isReady,
    matchesCurrent,
    upsertRecord
  } = useProjectArchive(projectId);
  const shouldGenerateOutline = Boolean(
    (!initialPackages || !initialOutline) && projectId && selectedDirection && projectTitle
  );
  const fallbackOutline = useMemo(() => buildOutlineFallback({
    projectTitle,
    selectedDirectionLabel: selectedDirection?.label,
    selectedDirectionDescription: selectedDirection?.description
  }), [projectTitle, selectedDirection?.description, selectedDirection?.label]);

  const applyGeneratedOutline = useCallback((content: string, keywords?: string[]) => {
    const resolvedOutline = buildOutlineFromContent({
      projectTitle,
      selectedDirectionLabel: selectedDirection?.label,
      selectedDirectionDescription: selectedDirection?.description,
      content,
      preferredKeywords: keywords
    });
    const generatedPackages = buildGeneratedPackages(projectTitle, resolvedOutline.abstract, resolvedOutline.keywords);

    setPackages(generatedPackages);
    setOutline(resolvedOutline.sections);
    setSelectedId(generatedPackages[0]?.id ?? "");
    setLoading(false);
    setMessage("已生成大纲草案，你可以先检查结构，再继续逐章写作。");
  }, [projectTitle, selectedDirection?.description, selectedDirection?.label]);

  const applyDefaultOutline = useCallback((nextMessage = "AI 响应较慢，已先切换到默认大纲，你可以继续编辑并稍后重试。") => {
    const defaultPackages = [
      {
        id: "package-1",
        label: "默认版本",
        title: projectTitle || "研究主题",
        abstract: fallbackOutline.abstract,
        positioning: "基于选定研究方向的默认结构方案",
        recommendedReason: "虽然 AI 还没完整返回，但这版已经按你的题目和方向先搭好了可写的研究骨架。",
        keywords: fallbackOutline.keywords
      }
    ] satisfies TitlePackage[];

    setPackages(defaultPackages);
    setOutline(fallbackOutline.sections);
    setSelectedId(defaultPackages[0]?.id ?? "");
    setLoading(false);
    setMessage(nextMessage);
  }, [fallbackOutline.abstract, fallbackOutline.keywords, fallbackOutline.sections, projectTitle]);

  // 从 AI 生成详细大纲
  useEffect(() => {
    if (!shouldGenerateOutline || useStreaming || !selectedDirection) {
      return;
    }

    const currentDirection = selectedDirection;

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let cancelled = false;

    const generateOutline = async () => {
      try {
        const response = await fetch("/api/ai/think", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            taskType: "outline_generation",
            context: {
              projectId,
              projectTitle,
              venueId: venueId || "ieee-iccci-2026",
              currentStep: "outline_generation",
              previousSteps: [],
              userInputs: {
                title: projectTitle,
                selectedDirection: currentDirection.label,
                directionDescription: currentDirection.description
              }
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (data.ok) {
          applyGeneratedOutline(data.content?.content || "", data.content?.metadata?.topics);
          return;
        }

        applyDefaultOutline();
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("生成大纲失败:", error);
        applyDefaultOutline();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void generateOutline();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    applyDefaultOutline,
    applyGeneratedOutline,
    projectId,
    projectTitle,
    selectedDirection,
    shouldGenerateOutline,
    useStreaming,
    venueId
  ]);

  useEffect(() => {
    if (!loading || !shouldGenerateOutline) {
      return;
    }

    const fallbackTimer = setTimeout(() => {
      applyDefaultOutline("AI 超过 40 秒仍未完成，已自动切换到默认大纲，你可以先继续写作。");
    }, OUTLINE_GENERATION_TIMEOUT_MS);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [applyDefaultOutline, loading, shouldGenerateOutline]);

  const selected = useMemo(
    () => packages.find((item) => item.id === selectedId) ?? packages[0],
    [packages, selectedId]
  );
  const outlineStatus = useMemo(() => buildStatusSummary(outline), [outline]);
  const currentTitle = customTitle.trim() || selected?.title || "";
  const currentReviewKey = selected?.id ?? "unknown";
  const archiveKey = "outline";
  const {
    error: historyError,
    loading: historyLoading,
    saveVersion,
    saving,
    versions
  } = useProjectVersionHistory<OutlineVersionPayload>(projectId, archiveKey);

  const runPackageCheck = useCallback(async () => {
    if (!selected) {
      return;
    }

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
  }, [currentReviewKey, currentTitle, selected, venueId]);

  useEffect(() => {
    if (loading || !selected || reviewMap[currentReviewKey]) {
      return;
    }

    void runPackageCheck();
  }, [currentReviewKey, loading, reviewMap, runPackageCheck, selected]);

  if (loading && useStreaming && selectedDirection && projectTitle) {
    return (
      <div className="workbench-stack">
        <section className="content-card stitch-panel decision-loading-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">第三步</span>
            <h3>AI 正在生成详细论文框架...</h3>
          </div>
          <p className="decision-loading__hint">
            如果等待时间过长，你也可以先用默认框架继续，不会卡住后续写作。
          </p>
          <div className="button-row decision-loading__actions">
            <button
              className="secondary-button"
              onClick={() => applyDefaultOutline("已切换到默认大纲，你可以先继续编辑，稍后再重新生成。")}
              type="button"
            >
              使用默认大纲
            </button>
          </div>
          <StreamingAiPanel
            taskType="outline_generation"
            context={{
              projectId,
              projectTitle,
              venueId: venueId || "ieee-iccci-2026",
              currentStep: "outline_generation",
              previousSteps: [],
              userInputs: {
                title: projectTitle,
                selectedDirection: selectedDirection.label,
                directionDescription: selectedDirection.description
              }
            }}
            onComplete={(result) => {
              applyGeneratedOutline(result.content || "");
            }}
            onError={(error) => {
              console.error("流式生成失败:", error);
              setUseStreaming(false);
              setLoading(true);
              setMessage("流式链路失败，正在自动改用稳定模式重试一次大纲生成...");
            }}
          />
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="workbench-stack">
        <section className="content-card stitch-panel decision-loading-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">第三步</span>
            <h3>AI 正在生成详细论文框架...</h3>
          </div>
          <div className="decision-loading">
            <div className="loading-spinner"></div>
            <p className="lead-text">
              系统正在根据你选择的研究方向生成详细论文框架，请稍候...
            </p>
            <p className="decision-loading__hint">
              如果等待时间过长，你也可以先用默认框架继续。
            </p>
            <button
              className="secondary-button"
              onClick={() => applyDefaultOutline("已切换到默认大纲，你可以先继续编辑，稍后再重新生成。")}
              type="button"
            >
              使用默认大纲
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!selected) {
    return null;
  }

  const abstractNote = customAbstractNote.trim();
  const currentSummary = `标题：${currentTitle}；当前框架共 ${outline.length} 个章节节点${
    abstractNote ? `；摘要提醒：${abstractNote}` : "；摘要暂未附加修改提醒。"
  }`;
  const currentFingerprint = createArchiveFingerprint([selected.id, currentTitle, abstractNote]);
  const archiveRecord = getRecord(archiveKey);
  const isCurrentArchived = matchesCurrent(archiveKey, currentFingerprint);
  const archiveStateLabel = isReady
    ? isCurrentArchived
      ? "已形成稳定结构基线"
      : "还需要确认并存档"
    : "正在读取存档状态";

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

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent stitch-panel">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第三步</span>
          <h3>先定一套框架包，再进入正文写作。</h3>
        </div>
        <p className="lead-text">
          这页先让你确认当前采用的框架包，再决定要不要微调标题、摘要提醒和章节骨架。真正要锁住的是“这一版结构”，而不是只看几个候选方案。
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

      <div className="outline-workbench-grid">
        <section className="content-card stitch-panel anchor-section" id="outline-packages">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">框架包列表</span>
            <h3>先选当前要推进的结构版本</h3>
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
                      {isActive ? "当前采用" : "切换到此方案"}
                    </StatusBadge>
                  </div>
                  <p className="choice-card__title">{item.title}</p>
                  <p>{item.positioning}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="decision-dossier">
          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">结构概览</span>
              <h3>这套内容已经够你继续往下写</h3>
            </div>
            <div className="decision-metrics">
              <div className="decision-metric">
                <span>章节节点</span>
                <strong>{outline.length}</strong>
                <p>已经拆成可直接进入写作的结构骨架。</p>
              </div>
              <div className="decision-metric">
                <span>已锁定章节</span>
                <strong>{outlineStatus.locked}</strong>
                <p>这些部分后面应尽量保持结构稳定。</p>
              </div>
              <div className="decision-metric">
                <span>存档状态</span>
                <strong>{archiveStateLabel}</strong>
                <p>定稿后再进入逐章写作，后面更不容易跑偏。</p>
              </div>
            </div>
            <div className="stack-list top-gap">
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

          <section className="content-card stitch-panel anchor-section" id="outline-editing">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">人工校准</span>
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
      </div>

      <div className="outline-insight-grid">
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

        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">结构状态</span>
            <h3>现在这套框架还差哪几处补齐</h3>
          </div>
          <div className="decision-metrics">
            <div className="decision-metric">
              <span>草稿中</span>
              <strong>{outlineStatus.drafting}</strong>
              <p>这些章节优先补结构和目标描述。</p>
            </div>
            <div className="decision-metric">
              <span>待补充</span>
              <strong>{outlineStatus.pending}</strong>
              <p>这些章节后面最容易拖慢写作节奏。</p>
            </div>
            <div className="decision-metric">
              <span>关键词数</span>
              <strong>{selected.keywords.length}</strong>
              <p>后面引言和摘要要围绕这些关键词展开。</p>
            </div>
          </div>
          <div className="stack-list top-gap">
            <div className="line-item line-item--column">
              <strong>建议先处理</strong>
              <p>优先把“待补充”的章节补成可写状态，再去润色已经锁定的章节。</p>
            </div>
            <div className="line-item line-item--column">
              <strong>进入正文前的最低标准</strong>
              <p>每一章都要至少说清“这一章为什么存在、准备写什么、顺序为什么这样排”。</p>
            </div>
          </div>
        </section>
      </div>

      <section className="content-card stitch-panel anchor-section" id="outline-structure">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">章节骨架</span>
          <h3>每章写什么，AI 也应该提前拆给你看</h3>
          <p className="lead-text">
            你可以点击章节进行编辑，AI 会根据你的修改提供建议，帮助你完善大纲结构。
          </p>
        </div>
        <div className="outline-list">
          {outline.map((section, index) => {
            const edited = editedSections[section.id] || {};
            const isEditing = editingSection === section.id;
            
            return (
              <div key={section.id} className="outline-item">
                <div className="outline-item__index">0{index + 1}</div>
                <div className="outline-item__body">
                  {isEditing ? (
                    <div className="outline-section-editor">
                      <div className="field">
                        <span>章节标题</span>
                        <input
                          value={edited.title || section.title}
                          onChange={(e) => setEditedSections(prev => ({
                            ...prev,
                            [section.id]: {
                              ...prev[section.id],
                              title: e.target.value
                            }
                          }))}
                        />
                      </div>
                      <div className="field top-gap">
                        <span>章节目标</span>
                        <textarea
                          value={edited.goal || section.goal}
                          onChange={(e) => setEditedSections(prev => ({
                            ...prev,
                            [section.id]: {
                              ...prev[section.id],
                              goal: e.target.value
                            }
                          }))}
                          rows={2}
                        />
                      </div>
                      <div className="field top-gap">
                        <span>章节摘要</span>
                        <textarea
                          value={edited.summary || section.summary}
                          onChange={(e) => setEditedSections(prev => ({
                            ...prev,
                            [section.id]: {
                              ...prev[section.id],
                              summary: e.target.value
                            }
                          }))}
                          rows={3}
                        />
                      </div>
                      <div className="outline-edit-actions top-gap">
                        <button
                          className="small-button"
                          onClick={() => {
                            setEditingSection(null);
                            setEditedSections(prev => {
                              const newEdited = { ...prev };
                              delete newEdited[section.id];
                              return newEdited;
                            });
                          }}
                          type="button"
                        >
                          取消
                        </button>
                        <button
                          className="small-button"
                          onClick={() => {
                            setOutline(prev => prev.map(s => 
                              s.id === section.id 
                                ? { ...s, ...editedSections[section.id] }
                                : s
                            ));
                            setEditingSection(null);
                            setEditedSections(prev => {
                              const newEdited = { ...prev };
                              delete newEdited[section.id];
                              return newEdited;
                            });
                          }}
                          type="button"
                        >
                          保存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="outline-item__head">
                        <strong>{edited.title || section.title}</strong>
                        <div className="outline-edit-actions">
                          <StatusBadge tone={badgeTone(section.status)}>{section.status}</StatusBadge>
                          <button
                            className="small-button"
                            onClick={() => setEditingSection(section.id)}
                            type="button"
                          >
                            编辑
                          </button>
                        </div>
                      </div>
                      <p>{edited.goal || section.goal}</p>
                      <p className="section-summary">{edited.summary || section.summary}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hint-panel top-gap">
          <strong>AI 引导建议</strong>
          <p>修改章节内容后，AI 会分析你的调整并给出结构建议，帮助你把后面的写作入口先稳定下来。</p>
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
        title="框架不能只是看过，得把这一版正式锁住"
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
