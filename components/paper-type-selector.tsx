"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import {
  paperTypeProfiles,
  getPaperTypeById,
  type PaperCategory,
  type PaperTypeProfile
} from "@/lib/paper-type-profiles";

type PaperTypeSelectorProps = {
  onTypeChange?: (paperType: PaperCategory) => void;
  initialType?: PaperCategory;
  compact?: boolean;
};

export function PaperTypeSelector({ onTypeChange, initialType, compact = false }: PaperTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<PaperCategory>(initialType ?? "ei-conference");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<string>("");
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);

  const selectedProfile = getPaperTypeById(selectedType);
  const compactRequirements = [
    { label: "摘要", value: selectedProfile.requirements.abstract.split("，")[0] },
    { label: "篇幅", value: selectedProfile.requirements.length.split("，")[0] },
    { label: "结构", value: selectedProfile.requirements.structure.split("，")[0] }
  ];

  const compactFocus = [
    { label: "语调", value: selectedProfile.writingStyle.tone.split("，")[0] },
    { label: "深度", value: selectedProfile.writingStyle.depth.split("，")[0] },
    { label: "读者", value: selectedProfile.writingStyle.audience.split("和")[0] }
  ];

  const handleTypeSelect = (typeId: PaperCategory) => {
    setSelectedType(typeId);
    setIsDropdownOpen(false);
    if (onTypeChange) {
      onTypeChange(typeId);
    }
  };

  useEffect(() => {
    async function fetchAiGuidance() {
      setIsLoadingGuidance(true);
      try {
        const response = await fetch("/api/ai/paper-guidance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            paperType: selectedType
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAiGuidance(data.guidance);
        }
      } catch (error) {
        console.error("Failed to fetch AI guidance:", error);
      } finally {
        setIsLoadingGuidance(false);
      }
    }

    fetchAiGuidance();
  }, [selectedType]);

  return (
    <div className={`workbench-stack ${compact ? "paper-type-selector--compact" : ""}`}>
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">论文类型</span>
          <h3>选择你要创作的论文类型</h3>
          <p>不同类型的论文有不同的格式要求、写作风格和投稿流程，AI会根据你的选择提供针对性的指导</p>
        </div>

        <div className="selection-spotlight top-gap">
          <div>
            <span className="selection-spotlight__label">当前选择</span>
            <strong>{selectedProfile.icon} {selectedProfile.name}</strong>
            <p>{selectedProfile.description}</p>
          </div>
          <StatusBadge tone="sage">{selectedProfile.category}</StatusBadge>
        </div>

        <div className="top-gap">
          <button
            className="choice-card paper-type-trigger"
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="line-item__head">
              <strong>点击选择论文类型</strong>
              <span className="paper-type__meta-text">
                {isDropdownOpen ? "收起 ▲" : "展开 ▼"}
              </span>
            </div>
            <p className="paper-type__description">
              EI会议 · SCI期刊 · 核心期刊 · 学位论文 · 学术会议 · 技术文章
            </p>
          </button>

          {isDropdownOpen && (
            <div className="stack-list top-gap paper-type-dropdown">
              {paperTypeProfiles.map((profile) => {
                const isSelected = profile.id === selectedType;
                return (
                  <button
                    key={profile.id}
                    className={isSelected ? "choice-card choice-card--active paper-type-option" : "choice-card paper-type-option"}
                    type="button"
                    onClick={() => handleTypeSelect(profile.id)}
                  >
                    <div className="line-item__head">
                      <strong>
                        <span className="paper-type__icon">{profile.icon}</span>
                        {profile.name}
                      </strong>
                      <StatusBadge tone={isSelected ? "sage" : "default"}>
                        {isSelected ? "已选择" : profile.category}
                      </StatusBadge>
                    </div>
                    <p className="paper-type__hint">{profile.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {compact ? (
        <section className="content-card paper-type-compact-summary">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前约束</span>
            <h3>首页只保留最关键的 3 条要求</h3>
            <p>更详细的引导、投稿平台和完整流程，进入新项目后再继续展开。</p>
          </div>
          <div className="paper-type-compact-grid top-gap">
            <div className="paper-type-compact-block">
              <strong>核心要求</strong>
              <div className="paper-type-compact-tags top-gap">
                {compactRequirements.map((item) => (
                  <div key={item.label} className="paper-type-compact-tag">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="paper-type-compact-block">
              <strong>写作取向</strong>
              <div className="paper-type-compact-tags top-gap">
                {compactFocus.map((item) => (
                  <div key={item.label} className="paper-type-compact-tag">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="button-row top-gap">
                <Link
                  className="primary-button"
                  href={`/projects/new?paperType=${selectedType}`}
                >
                  开始创作{selectedProfile.shortName}
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">格式要求</span>
          <h3>{selectedProfile.name}的核心要求</h3>
        </div>
        <div className="stack-list">
          {(compact
            ? compactRequirements
            : [
                { label: "摘要要求", value: selectedProfile.requirements.abstract },
                { label: "关键词要求", value: selectedProfile.requirements.keywords },
                { label: "篇幅要求", value: selectedProfile.requirements.length },
                { label: "结构要求", value: selectedProfile.requirements.structure },
                { label: "参考文献要求", value: selectedProfile.requirements.references },
                { label: "图表要求", value: selectedProfile.requirements.figures }
              ]
          ).map((item) => (
            <div key={item.label} className="line-item line-item--column">
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">写作风格</span>
          <h3>目标读者与表达方式</h3>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <span>语调风格</span>
            <strong>{selectedProfile.writingStyle.tone}</strong>
          </div>
          <div className="metric-card">
            <span>内容深度</span>
            <strong>{selectedProfile.writingStyle.depth}</strong>
          </div>
          <div className="metric-card">
            <span>目标读者</span>
            <strong>{selectedProfile.writingStyle.audience}</strong>
          </div>
        </div>
      </section>
      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">AI智能引导</span>
          <h3>针对{selectedProfile.name}的专属建议</h3>
        </div>
        {isLoadingGuidance ? (
          <div className="hint-panel">
            <strong>AI正在分析...</strong>
            <p>正在为您生成针对性的写作指导建议</p>
          </div>
        ) : aiGuidance ? (
          <div className="hint-panel paper-type__pre-wrap">
            {aiGuidance}
          </div>
        ) : (
          <div className="hint-panel">
            <strong>准备建议</strong>
            <ul className="bullet-list">
              {selectedProfile.guidance.preparation.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">开始流程</span>
          <h3>按步骤完成你的{selectedProfile.name}</h3>
        </div>
        <div className="stack-list">
          {selectedProfile.onboardingSteps.map((step) => (
            <div key={step.step} className="outline-item">
              <div className="outline-item__index">{step.step}</div>
              <div className="outline-item__body">
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="button-row top-gap">
          <Link
            className="primary-button"
            href={`/projects/new?paperType=${selectedType}`}
          >
            开始创作{selectedProfile.shortName}
          </Link>
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">推荐投稿平台</span>
          <h3>适合{selectedProfile.name}的发表渠道</h3>
        </div>
        <div className="keyword-cluster">
          {selectedProfile.suitableVenues.map((venue) => (
            <span key={venue} className="ghost-chip">
              {venue}
            </span>
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
