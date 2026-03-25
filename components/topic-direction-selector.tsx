"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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

type TopicTypeOption = {
  id: string;
  label: string;
  description: string;
  confidence: string;
  whyItFits: string[];
  writingStrategy: string[];
  readyOutputs: string[];
};

type TopicDirectionSelectorProps = {
  projectId: string;
  options?: TopicTypeOption[];
  venueId?: string;
  projectTitle?: string;
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
  options: initialOptions,
  venueId,
  projectTitle
}: TopicDirectionSelectorProps) {
  const [options, setOptions] = useState<TopicTypeOption[]>(initialOptions || []);
  const [loading, setLoading] = useState(!initialOptions);
  const [selectedId, setSelectedId] = useState(initialOptions?.[0]?.id ?? "");
  const [customNote, setCustomNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("确认并存档后，服务端会保留可回滚的方向版本。");
  const { archiveCurrent, getRecord, isReady, matchesCurrent, upsertRecord } = useProjectArchive(projectId);

  // 从AI分析获取5个研究方向
  useEffect(() => {
    if (!initialOptions && projectId && projectTitle) {
      setLoading(true);
      
      const fetchDirections = async () => {
        try {
          const response = await fetch("/api/ai/think", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              taskType: "topic_analysis",
              context: {
                projectId,
                projectTitle,
                venueId: venueId || "ieee-iccci-2026",
                currentStep: "topic_analysis",
                previousSteps: [],
                userInputs: {
                  title: projectTitle
                }
              }
            })
          });

          const data = await response.json();

          if (data.ok && data.content?.metadata?.directions) {
            const directions = data.content.metadata.directions.map((dir: any, index: number) => ({
              id: dir.id || `direction-${index + 1}`,
              label: dir.label || `方向${index + 1}`,
              description: dir.description || dir.content || "",
              confidence: dir.confidence?.toString() || "90",
              whyItFits: dir.whyItFits || ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: dir.writingStrategy || ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: dir.readyOutputs || []
            }));
            
            setOptions(directions);
            if (directions.length > 0) {
              setSelectedId(directions[0].id);
            }
          }
        } catch (error) {
          console.error("获取研究方向失败:", error);
          // 提供默认方向
          setOptions([
            {
              id: "direction-1",
              label: "方向1：理论研究",
              description: "从理论角度深入分析研究主题，构建完整的理论框架",
              confidence: "95",
              whyItFits: ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: ["理论框架", "文献综述", "研究方法"]
            },
            {
              id: "direction-2",
              label: "方向2：实证研究",
              description: "通过实验和数据收集，验证研究假设",
              confidence: "92",
              whyItFits: ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: ["实验设计", "数据收集", "结果分析"]
            },
            {
              id: "direction-3",
              label: "方向3：应用研究",
              description: "将研究成果应用到实际场景中，验证其可行性和效果",
              confidence: "90",
              whyItFits: ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: ["应用场景", "案例分析", "效果评估"]
            },
            {
              id: "direction-4",
              label: "方向4：比较研究",
              description: "与相关研究进行比较，突出研究的创新点和优势",
              confidence: "88",
              whyItFits: ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: ["文献对比", "方法比较", "结果比较"]
            },
            {
              id: "direction-5",
              label: "方向5：跨学科研究",
              description: "结合多个学科的理论和方法，提供综合性的研究视角",
              confidence: "85",
              whyItFits: ["符合研究主题的核心方向", "具有学术价值和创新性", "可行性高，研究资源可获取"],
              writingStrategy: ["从理论基础出发，构建研究框架", "结合实证研究，验证研究假设", "强调研究贡献和实践意义"],
              readyOutputs: ["跨学科理论", "方法整合", "综合分析"]
            }
          ]);
          setSelectedId("direction-1");
        } finally {
          setLoading(false);
        }
      };

      fetchDirections();
    }
  }, [projectId, projectTitle, initialOptions]);

  const selected = options.find((item) => item.id === selectedId) ?? options[0];
  const currentNote = customNote.trim();

  if (loading) {
    return (
      <div className="workbench-stack">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">第二步</span>
            <h3>AI 正在分析您的研究主题，生成详细方向...</h3>
          </div>
          <p className="lead-text">
            系统正在根据您的研究主题生成5个详细的研究方向，请稍候...
          </p>
        </section>
      </div>
    );
  }

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
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第二步</span>
          <h3>先从 AI 给出的路线里选一条，再决定要不要自己微调。</h3>
        </div>
        <p className="lead-text">
          移动版先把当前选中的方向放在最上面，再把可选方案排在下面。你不用一边横向比较、一边来回找说明，顺着往下看就能完成这一页。
        </p>
        <div className="selection-spotlight top-gap">
          <div>
            <span className="selection-spotlight__label">当前选中</span>
            <strong>{selected.label}</strong>
            <p>{selected.description}</p>
          </div>
          <StatusBadge tone={toneFromConfidence(selected.confidence)}>
            {selected.confidence}
          </StatusBadge>
        </div>
        <div className="keyword-cluster top-gap">
          {selected.readyOutputs.map((item) => (
            <span key={item} className="ghost-chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">AI 已备好 5 个方向</span>
          <h3>你先选一个最符合你研究目标的方向</h3>
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

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前选中方案</span>
            <h3>{selected.label}</h3>
          </div>
          <div className="stack-list">
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

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">你也可以直接改</span>
            <h3>如果不想完全照着 AI 方案走，就在这里补一句方向说明</h3>
          </div>
          <div className="field field--full">
            <textarea
              onChange={(event) => setCustomNote(event.target.value)}
              placeholder="例如：我想保留设计实践主线，但用户测试部分要写得更重，结果章要突出情感识别度。"
              rows={4}
              value={customNote}
            />
          </div>
          <div className="hint-panel top-gap">
            <strong>系统反馈</strong>
            <p>{statusMessage}</p>
          </div>
        </section>
      </div>

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
  );
}
