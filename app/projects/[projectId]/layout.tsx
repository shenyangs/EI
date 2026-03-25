import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressStrip } from "@/components/progress-strip";
import { ProjectNav } from "@/components/project-nav";
import { StatusBadge } from "@/components/status-badge";
import { VenueHeaderInfo } from "@/components/venue-header-info";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { getProjectById } from "@/lib/demo-data";

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  const ai = getAiCapabilitySnapshot();

  if (!project) {
    notFound();
  }

  return (
    <main className="project-shell">
      <section className="project-summary">
        <div className="project-summary__top">
          <Link className="sidebar-home" href="/">
            返回项目首页
          </Link>
          <StatusBadge tone="amber">{project.stage}</StatusBadge>
        </div>
        <div className="project-summary__body">
          <div>
            <span className="eyebrow">当前项目</span>
            <h1>{project.title}</h1>
            <p>{project.subtitle}</p>
          </div>
          <div className="hero-actions">
            <span className="ghost-chip">主题方向已确定</span>
            <span className="ghost-chip">框架可继续细化</span>
            <span className="ghost-chip ghost-chip--accent">
              {ai.canUseWebSearch ? "M2.7 联网能力已开" : "联网能力待接入"}
            </span>
          </div>
        </div>
        <div className="project-hero">
          <div>
            <VenueHeaderInfo />
          </div>
        </div>
        <div className="progress-card">
          {project.progress.map((item) => (
            <ProgressStrip key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section className="project-main">
        <section className="content-card content-card--soft project-nav-shell">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">流程导航</span>
            <h3>一步一屏，按顺序推进</h3>
          </div>
          <ProjectNav projectId={project.id} />
        </section>
        {children}
      </section>

      <div className="mobile-project-dock" aria-hidden="false">
        <ProjectNav projectId={project.id} variant="dock" />
      </div>
    </main>
  );
}
