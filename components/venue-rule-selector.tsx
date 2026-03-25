"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { buildVenueHref, venueProfiles, type VenueProfile } from "@/lib/venue-profiles";

type VenueRuleSelectorProps = {
  projectHref: string;
  initialVenueId?: string;
};

const publishers: Array<VenueProfile["publisher"]> = ["IEEE", "ACM", "Springer", "通用"];

export function VenueRuleSelector({
  projectHref,
  initialVenueId
}: VenueRuleSelectorProps) {
  const [activePublisher, setActivePublisher] = useState<VenueProfile["publisher"]>("IEEE");
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId ?? "ieee-iccci-2026");

  const visibleProfiles = useMemo(
    () => venueProfiles.filter((item) => item.publisher === activePublisher),
    [activePublisher]
  );
  const selectedProfile =
    venueProfiles.find((item) => item.id === selectedVenueId) ?? venueProfiles[1];

  return (
    <div className="stack-list top-gap">
      <div className="keyword-cluster">
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

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">规则来源</span>
            <h3>先选出版方或具体会议</h3>
          </div>
          <div className="stack-list">
            {visibleProfiles.map((profile) => {
              const isActive = profile.id === selectedProfile.id;

              return (
                <button
                  key={profile.id}
                  className={isActive ? "choice-card choice-card--active" : "choice-card"}
                  onClick={() => setSelectedVenueId(profile.id)}
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
      </div>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">适配建议</span>
          <h3>这个规则组更适合哪些论文</h3>
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
  );
}
