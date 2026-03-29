import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProgressStrip } from "@/components/progress-strip";
import { ProjectNav } from "@/components/project-nav";
import { StatusBadge } from "@/components/status-badge";
import { VenueHeaderInfo } from "@/components/venue-header-info";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { getProjectViewById } from "@/lib/project-view";

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectViewById(projectId);
  const ai = getAiCapabilitySnapshot();

  if (!project) {
    notFound();
  }

  return (
    <main className="project-shell">
      <section className="project-summary project-summary--scholarly">
        <div className="project-summary__top">
          <Link className="sidebar-home" href="/">
            返回项目首页
          </Link>
          <StatusBadge tone="amber">{project.stage}</StatusBadge>
        </div>
        <div className="project-summary__body">
          <div className="project-summary__copy">
            <span className="eyebrow">当前项目</span>
            <h1>{project.title}</h1>
            <p>{project.subtitle}</p>
          </div>
          <div className="hero-actions project-summary__signals">
            <span className="ghost-chip">研究方向已绑定</span>
            <span className="ghost-chip">结构可继续细化</span>
            <span className="ghost-chip">文献与证据可独立整理</span>
            <span className="ghost-chip ghost-chip--accent">
              {ai.canUseWebSearch ? "联网检索可用" : "联网检索待接入"}
            </span>
          </div>
        </div>
        <div className="project-hero project-hero--scholarly">
          <div className="project-hero__copy">
            <Suspense fallback={null}>
              <VenueHeaderInfo />
            </Suspense>
          </div>
          <div className="project-summary__note">
            <span className="eyebrow">当前操作原则</span>
            <p>先完成当前步骤，再进入下一步。项目页负责判断方向是否正确，不让用户在错误阶段做太多事。</p>
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
            <h3>研究流程导航（6 步）</h3>
            <p>首页、项目页、写作页和文献页都围着同一条主线走，不让用户在不同页面学两套逻辑。</p>
          </div>
          <Suspense fallback={null}>
            <ProjectNav projectId={project.id} />
          </Suspense>
        </section>
        {children}
      </section>

      <div className="mobile-project-dock" aria-hidden="false">
        <Suspense fallback={null}>
          <ProjectNav projectId={project.id} variant="dock" />
        </Suspense>
      </div>
    </main>
  );
}
