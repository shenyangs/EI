import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectNav } from "@/components/project-nav";
import { StatusBadge } from "@/components/status-badge";
import { VenueHeaderInfo } from "@/components/venue-header-info";
import { getProjectViewById } from "@/lib/project-view";

function describeProgress(value: number) {
  if (value >= 100) {
    return { status: "已完成", note: "当前阶段已经锁定" };
  }

  if (value >= 80) {
    return { status: "已成型", note: "可以继续向下推进" };
  }

  if (value >= 50) {
    return { status: "推进中", note: "当前主线正在处理" };
  }

  if (value > 0) {
    return { status: "已启动", note: "基础已经建立" };
  }

  return { status: "待开始", note: "等前一步完成后开启" };
}

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectViewById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <main className="atelier-project-shell">
      <section className="atelier-project-masthead">
        <div className="atelier-project-masthead__main">
          <div className="atelier-project-masthead__top">
            <Link className="atelier-text-link" href="/">
              返回项目首页
            </Link>
            <StatusBadge tone="amber">{project.stage}</StatusBadge>
          </div>
          <span className="atelier-kicker">当前项目</span>
          <h1>{project.title}</h1>
          <p>{project.subtitle}</p>
        </div>

        <aside className="atelier-project-masthead__rail">
          <Suspense fallback={null}>
            <VenueHeaderInfo />
          </Suspense>
        </aside>
      </section>

      <section className="atelier-project-ribbon">
        {project.progress.map((item) => {
          const detail = describeProgress(item.value);

          return (
            <article key={item.label} className="atelier-project-ribbon__item">
              <span>{item.label}</span>
              <strong>{detail.status}</strong>
              <small>{detail.note}</small>
            </article>
          );
        })}
      </section>

      <section className="atelier-project-navwrap">
        <Suspense fallback={null}>
          <ProjectNav projectId={project.id} />
        </Suspense>
      </section>

      <div className="atelier-project-content">{children}</div>
    </main>
  );
}
