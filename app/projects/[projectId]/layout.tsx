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
    <main className="project-layout">
      <aside className="project-sidebar">
        <Link className="sidebar-home" href="/">
          返回项目首页
        </Link>
        <div className="sidebar-project">
          <span className="eyebrow">当前项目</span>
          <h1>{project.title}</h1>
          <p>{project.subtitle}</p>
          <StatusBadge tone="amber">{project.stage}</StatusBadge>
        </div>
        <ProjectNav projectId={project.id} />
      </aside>

      <section className="project-main">
        <div className="project-hero">
          <div>
            <VenueHeaderInfo />
          </div>
          <div className="hero-actions">
            <span className="ghost-chip">主题方向已确定</span>
            <span className="ghost-chip">框架可继续细化</span>
            <span className="ghost-chip ghost-chip--accent">
              {ai.canUseWebSearch ? "M2.7 联网能力已开" : "联网能力待接入"}
            </span>
          </div>
        </div>

        <div className="progress-card">
          {project.progress.map((item) => (
            <ProgressStrip key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        {children}
      </section>
    </main>
  );
}
