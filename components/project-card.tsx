import Link from "next/link";

import type { ProjectCardItem } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";
import { buildVenueHref } from "@/lib/venue-profiles";

type ProjectCardProps = {
  project: ProjectCardItem;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const tone =
    project.accent === "amber"
      ? "amber"
      : project.accent === "sage"
        ? "sage"
        : "default";
  const href = buildVenueHref(`/projects/${project.id}`, project.venueId);
  const cardClassName = [
    "project-card",
    `project-card--${project.accent}`,
    project.available === false ? "project-card--disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const footerText = project.available === false ? "内容准备中" : "继续进入";
  const progressSummary =
    project.stage === "已确定主题方向"
      ? "下一步：进入题型与方案"
      : project.stage === "已拆论文框架"
        ? "下一步：进入逐章写作"
        : project.stage === "分章节写作中"
          ? "下一步：继续处理当前章节"
          : "下一步：检查全文并导出";

  const cardBody = (
    <>
      <div className="project-card__meta">
        <StatusBadge tone={tone}>{project.stage}</StatusBadge>
        <span>{project.updatedAt}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.subtitle}</p>
      <div className="project-card__summary">
        <div className="project-card__summary-copy">
          <span>当前阶段</span>
          <strong>{project.stage}</strong>
        </div>
        <div className="project-card__summary-copy">
          <span>系统建议</span>
          <strong>{progressSummary}</strong>
        </div>
      </div>
      <div className="project-card__footer">
        <span>{project.conference}</span>
        <span>{footerText}</span>
      </div>
    </>
  );

  if (project.available === false) {
    return <article className={cardClassName}>{cardBody}</article>;
  }

  return (
    <Link className={cardClassName} href={href}>
      {cardBody}
    </Link>
  );
}
