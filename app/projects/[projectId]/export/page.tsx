import Link from "next/link";
import { notFound } from "next/navigation";

import { ExportPanel } from "@/components/export-panel";
import { FullTextPreview } from "@/components/fulltext-preview";
import { StatusBadge } from "@/components/status-badge";
import { getProjectViewById } from "@/lib/project-view";
import {
  getPriorityReviewAction,
  getReviewAction,
  type ReviewIssue
} from "@/lib/quality-review-actions";
import { buildVenueHref, getVenueProfileById } from "@/lib/venue-profiles";

export default async function ExportPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string }>;
}) {
  const { projectId } = await params;
  const { venue } = await searchParams;
  const project = await getProjectViewById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  const reviewContext = {
    projectId: project.id,
    scope: "fulltext" as const,
    sections: project.fullText.sections.map((section) => ({
      id: section.id,
      title: section.title
    })),
    venueId: venueProfile.id
  };
  const staticIssues: ReviewIssue[] = project.checks.map((item) => ({
    detail: item.description,
    dimension: item.title,
    level: item.level
  }));
  const priorityAction = getPriorityReviewAction(staticIssues, reviewContext);

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第五步</span>
          <h3>全文页先把完整稿摆出来，再决定是否定稿。</h3>
        </div>
        <p className="lead-text">
          移动版把“通读全文”“看自检结果”“确认并存档”拆成顺序明确的单列流程，避免一上来只看到零散检查项。
        </p>
      </section>

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">导出前检查</span>
            <h3>该改的地方也一起明说</h3>
          </div>
          <div className="stack-list">
            {project.checks.map((item) => {
              const action = getReviewAction(
                {
                  detail: item.description,
                  dimension: item.title,
                  level: item.level
                },
                reviewContext
              );

              return (
                <div key={item.title} className="line-item line-item--column">
                  <div className="line-item__head">
                    <strong>{item.title}</strong>
                    <StatusBadge
                      tone={
                        item.level === "通过"
                          ? "sage"
                          : item.level === "建议修改"
                            ? "amber"
                            : "rose"
                      }
                    >
                      {item.level}
                    </StatusBadge>
                  </div>
                  <span>{item.description}</span>
                  {action ? (
                    <div className="review-actions">
                      <Link className="secondary-button review-action-button" href={action.href}>
                        {action.label}
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {priorityAction ? (
            <div className="button-row top-gap">
              <Link className="primary-button review-action-button" href={priorityAction.href}>
                {priorityAction.label}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前稿件状态</span>
            <h3>这一版已经接近可导出</h3>
          </div>
          <ul className="bullet-list">
            <li>摘要、关键词和 5 个主体部分已经合成为一版完整稿。</li>
            <li>先在下方点“确认并存档当前全文”，把这一版正式冻结成导出基线。</li>
            <li>如果你要继续修正文风，可以先回到逐章写作页。</li>
          </ul>
          <div className="button-row top-gap">
            <Link className="secondary-button" href={buildVenueHref(`/projects/${project.id}/writing`, venue)}>
              返回逐章修改
            </Link>
          </div>
        </section>
      </div>

      <FullTextPreview
        abstract={project.fullText.abstract}
        keywords={project.fullText.keywords}
        projectId={project.id}
        projectTitle={project.title}
        sections={project.fullText.sections}
        venueProfile={venueProfile}
      />

      <ExportPanel
        projectTitle={project.title}
        abstract={project.fullText.abstract}
        keywords={project.fullText.keywords}
        sections={project.fullText.sections}
        venueProfile={venueProfile}
      />
    </div>
  );
}
