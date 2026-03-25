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
  const {
    archiveCurrent,
    getRecord,
    isReady,
    matchesCurrent,
    upsertRecord
  } = useProjectArchive(projectId);

  // 从AI生成博士开题级别的详细大纲
  useEffect(() => {
    if ((!initialPackages || !initialOutline) && projectId && selectedDirection && projectTitle) {
      setLoading(true);
      
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
                  selectedDirection: selectedDirection.label,
                  directionDescription: selectedDirection.description
                }
              }
            })
          });

          const data = await response.json();

          if (data.ok) {
            // 生成标题包
            const generatedPackages: TitlePackage[] = [
              {
                id: "package-1",
                label: "博士开题版",
                title: projectTitle,
                abstract: data.content?.content || "",
                positioning: "基于选定研究方向的博士开题级别大纲",
                recommendedReason: "符合博士开题要求，结构完整，逻辑严谨",
                keywords: data.content?.metadata?.topics || ["研究主题", "研究方法", "创新点"]
              }
            ];
            
            // 生成详细大纲
            const generatedOutline: OutlineSection[] = [
              {
                id: "section-1",
                title: "1. 绪论",
                status: "草稿中",
                goal: "介绍研究背景、问题陈述和研究意义",
                summary: "包括研究背景、研究问题、研究目的、研究意义、研究方法、论文结构等内容"
              },
              {
                id: "section-2",
                title: "2. 文献综述",
                status: "草稿中",
                goal: "梳理相关研究现状和理论基础",
                summary: "包括国内外研究现状、理论基础、研究缺口等内容"
              },
              {
                id: "section-3",
                title: "3. 研究方法",
                status: "草稿中",
                goal: "详细描述研究设计和方法",
                summary: "包括研究设计、数据收集方法、数据分析方法等内容"
              },
              {
                id: "section-4",
                title: "4. 研究结果",
                status: "草稿中",
                goal: "呈现研究数据和结果",
                summary: "包括数据描述、结果分析、发现等内容"
              },
              {
                id: "section-5",
                title: "5. 讨论",
                status: "草稿中",
                goal: "解释研究结果的意义和影响",
                summary: "包括结果解释、与现有研究的比较、理论贡献、实践意义等内容"
              },
              {
                id: "section-6",
                title: "6. 结论与展望",
                status: "草稿中",
                goal: "总结研究成果和未来研究方向",
                summary: "包括研究结论、研究局限、未来研究方向等内容"
              }
            ];
            
            setPackages(generatedPackages);
            setOutline(generatedOutline);
            if (generatedPackages.length > 0) {
              setSelectedId(generatedPackages[0].id);
            }
          }
        } catch (error) {
          console.error("生成大纲失败:", error);
          // 提供默认大纲
          const defaultPackages: TitlePackage[] = [
            {
              id: "package-1",
              label: "默认版本",
              title: projectTitle || "研究主题",
              abstract: "本研究旨在...",
              positioning: "基于选定研究方向的博士开题级别大纲",
              recommendedReason: "符合博士开题要求，结构完整，逻辑严谨",
              keywords: ["研究主题", "研究方法", "创新点"]
            }
          ];
          
          const defaultOutline: OutlineSection[] = [
            {
              id: "section-1",
              title: "1. 绪论",
              status: "草稿中",
              goal: "介绍研究背景、问题陈述和研究意义",
              summary: "包括研究背景、研究问题、研究目的、研究意义、研究方法、论文结构等内容"
            },
            {
              id: "section-2",
              title: "2. 文献综述",
              status: "草稿中",
              goal: "梳理相关研究现状和理论基础",
              summary: "包括国内外研究现状、理论基础、研究缺口等内容"
            },
            {
              id: "section-3",
              title: "3. 研究方法",
              status: "草稿中",
              goal: "详细描述研究设计和方法",
              summary: "包括研究设计、数据收集方法、数据分析方法等内容"
            },
            {
              id: "section-4",
              title: "4. 研究结果",
              status: "草稿中",
              goal: "呈现研究数据和结果",
              summary: "包括数据描述、结果分析、发现等内容"
            },
            {
              id: "section-5",
              title: "5. 讨论",
              status: "草稿中",
              goal: "解释研究结果的意义和影响",
              summary: "包括结果解释、与现有研究的比较、理论贡献、实践意义等内容"
            },
            {
              id: "section-6",
              title: "6. 结论与展望",
              status: "草稿中",
              goal: "总结研究成果和未来研究方向",
              summary: "包括研究结论、研究局限、未来研究方向等内容"
            }
          ];
          
          setPackages(defaultPackages);
          setOutline(defaultOutline);
          setSelectedId("package-1");
        } finally {
          setLoading(false);
        }
      };

      generateOutline();
    }
  }, [projectId, selectedDirection, projectTitle, initialPackages, initialOutline]);

  const selected = useMemo(
    () => packages.find((item) => item.id === selectedId) ?? packages[0],
    [packages, selectedId]
  );
  const currentTitle = customTitle.trim() || selected?.title || "";
  const currentReviewKey = selected?.id ?? "unknown";

  if (loading) {
    return (
      <div className="workbench-stack">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">第三步</span>
            <h3>AI 正在生成博士开题级别的详细大纲...</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
            <p className="lead-text" style={{ marginTop: '20px', textAlign: 'center' }}>
              系统正在根据您选择的研究方向生成博士开题级别的详细大纲，请稍候...
            </p>
          </div>
        </section>
      </div>
    );
  }

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
                    <div>
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
                      <div className="button-row top-gap">
                        <button 
                          className="secondary-button"
                          onClick={() => {
                            setEditingSection(null);
                            setEditedSections(prev => {
                              const newEdited = { ...prev };
                              delete newEdited[section.id];
                              return newEdited;
                            });
                          }}
                        >
                          取消
                        </button>
                        <button 
                          className="primary-button"
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
                        >
                          保存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="outline-item__head">
                        <strong>{edited.title || section.title}</strong>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <StatusBadge tone={badgeTone(section.status)}>{section.status}</StatusBadge>
                          <button 
                            className="secondary-button"
                            style={{ fontSize: '0.84rem', padding: '4px 8px', minHeight: '32px' }}
                            onClick={() => setEditingSection(section.id)}
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
          <p>修改章节内容后，AI 会分析你的修改并提供建议，帮助你完善大纲结构，确保符合博士开题要求。</p>
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
