"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { buildVenueHref, venueProfiles, type VenueProfile } from "@/lib/venue-profiles";

type VenueRuleSelectorProps = {
  projectHref: string;
  initialVenueId?: string;
  onVenueChange?: (venueId: string) => void;
};

const publishers: Array<VenueProfile["publisher"]> = ["IEEE", "ACM", "Springer", "通用"];

export function VenueRuleSelector({
  projectHref,
  initialVenueId,
  onVenueChange
}: VenueRuleSelectorProps) {
  const [activePublisher, setActivePublisher] = useState<VenueProfile["publisher"]>("IEEE");
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId ?? "ieee-iccci-2026");

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    if (onVenueChange) {
      onVenueChange(venueId);
    }
  };

  const visibleProfiles = useMemo(
    () => venueProfiles.filter((item) => item.publisher === activePublisher),
    [activePublisher]
  );
  const selectedProfile =
    venueProfiles.find((item) => item.id === selectedVenueId) ?? venueProfiles[1];

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">投稿规则</span>
          <h3>先选一套规则画像，后面所有判断都按它继续</h3>
        </div>
        <div className="selection-spotlight top-gap">
          <div>
            <span className="selection-spotlight__label">当前采用</span>
            <strong>{selectedProfile.shortName}</strong>
            <p>{selectedProfile.template}</p>
          </div>
          <StatusBadge tone="sage">{selectedProfile.publisher}</StatusBadge>
        </div>
        <div className="keyword-cluster top-gap">
          {publishers.map((publisher) => (
            <button
              key={publisher}
              className={publisher === activePublisher ? "choice-chip choice-chip--active" : "choice-chip"}
              onClick={() => setActivePublisher(publisher)}
              type="button"
            >
              {publisher}
            </button>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">规则来源</span>
          <h3>再从当前出版方里选一个具体会议</h3>
        </div>
        <div className="stack-list">
          {visibleProfiles.map((profile) => {
            const isActive = profile.id === selectedProfile.id;

            return (
              <button
                key={profile.id}
                className={isActive ? "choice-card choice-card--active" : "choice-card"}
                onClick={() => handleVenueChange(profile.id)}
                type="button"
              >
                <div className="line-item__head">
                  <strong>{profile.shortName}</strong>
                  <StatusBadge tone={isActive ? "sage" : "default"}>
                    {isActive ? "当前采用" : profile.familyLabel}
                  </StatusBadge>
                </div>
                <p>{profile.template}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前规则画像</span>
            <h3>{selectedProfile.name}</h3>
          </div>
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>摘要规则</strong>
              <span>{selectedProfile.abstractRule}</span>
            </div>
            <div className="line-item line-item--column">
              <strong>关键词规则</strong>
              <span>{selectedProfile.keywordRule}</span>
            </div>
            <div className="line-item line-item--column">
              <strong>篇幅规则</strong>
              <span>{selectedProfile.pageRule}</span>
            </div>
            <div className="line-item line-item--column">
              <strong>引用规则</strong>
              <span>{selectedProfile.referenceRule}</span>
            </div>
            <div className="line-item line-item--column">
              <strong>AI 使用提醒</strong>
              <span>{selectedProfile.aiPolicy}</span>
            </div>
          </div>
        </section>

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">适配建议</span>
            <h3>这套规则更适合哪些论文</h3>
          </div>
          <div className="keyword-cluster">
            {selectedProfile.fitFor.map((item) => (
              <span key={item} className="ghost-chip">
                {item}
              </span>
            ))}
          </div>
          <ul className="bullet-list top-gap">
            {selectedProfile.notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="button-row top-gap">
            <Link className="primary-button" href={buildVenueHref(projectHref, selectedProfile.id)}>
              用这套会议规则进入项目
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
