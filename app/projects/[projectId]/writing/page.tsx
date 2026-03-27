import { notFound } from "next/navigation";

import { ChapterWritingStudio } from "@/components/chapter-writing-studio";
import { StatusBadge } from "@/components/status-badge";
import { getProjectViewById } from "@/lib/project-view";
import { getVenueProfileById } from "@/lib/venue-profiles";

export default async function WritingPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ chapter?: string; venue?: string }>;
}) {
  const { projectId } = await params;
  const { chapter, venue } = await searchParams;
  const project = await getProjectViewById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第四步</span>
          <h3>逐章写作现在按“先选章节，再处理当前一章”来组织。</h3>
        </div>
        <p className="lead-text">
          这一页现在把章节切换、正文、修改指令、自检和存档拆成顺序更清楚的几段。你先处理当前章节，再决定是否进入全文预览。
        </p>
      </section>

        <ChapterWritingStudio
          chapters={project.chapterDrafts}
          initialChapterId={chapter}
          projectId={project.id}
          projectTitle={project.title}
          venueProfile={venueProfile}
        venueId={venue}
      />

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前引用</span>
            <h3>本项目已绑定的证据材料</h3>
          </div>
          <div className="stack-list">
            {project.references.map((item) => (
              <div key={item.id} className="line-item line-item--column">
                <strong>{item.title}</strong>
                <span>{item.source}</span>
                <StatusBadge tone={item.status === "已绑定" ? "sage" : "amber"}>
                  {item.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </section>

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">图文材料</span>
            <h3>后面写结果章时可以直接插入</h3>
          </div>
          <div className="stack-list">
            {project.assets.map((item) => (
              <div key={item.id} className="line-item line-item--column">
                <strong>{item.name}</strong>
                <span>
                  {item.type} · {item.usage}
                </span>
              </div>
            ))}
          </div>
          <div className="hint-panel top-gap">
            <strong>进入全文前先做一件事</strong>
            <p>等正文区里每一章都点过“确认并存档”后，章节区底部才会放开完整全文入口，这样全文整合才有稳定基线。</p>
          </div>
        </section>
      </div>
    </div>
  );
}
