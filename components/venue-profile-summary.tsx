import { StatusBadge } from "@/components/status-badge";
import type { VenueProfile } from "@/lib/venue-profiles";

type VenueProfileSummaryProps = {
  venue: VenueProfile;
};

export function VenueProfileSummary({ venue }: VenueProfileSummaryProps) {
  return (
    <section className="content-card stitch-panel">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">会议规则</span>
        <h3>{venue.shortName}</h3>
      </div>
      <div className="stack-list">
        <div className="line-item line-item--column">
          <div className="line-item__head">
            <strong>模板与篇幅</strong>
            <StatusBadge>{venue.publisher}</StatusBadge>
          </div>
          <span>{venue.template}</span>
          <span>{venue.pageRule}</span>
        </div>
        <div className="line-item line-item--column">
          <strong>摘要与关键词</strong>
          <span>{venue.abstractRule}</span>
          <span>{venue.keywordRule}</span>
        </div>
        <div className="line-item line-item--column">
          <strong>引用与审稿提醒</strong>
          <span>{venue.referenceRule}</span>
          <span>{venue.blindReview}</span>
        </div>
      </div>
    </section>
  );
}
