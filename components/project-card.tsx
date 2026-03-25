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

  const cardBody = (
    <>
      <div className="project-card__meta">
        <StatusBadge tone={tone}>{project.stage}</StatusBadge>
        <span>{project.updatedAt}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.subtitle}</p>
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
