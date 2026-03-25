import { notFound } from "next/navigation";

import { ChapterWritingStudio } from "@/components/chapter-writing-studio";
import { StatusBadge } from "@/components/status-badge";
import { getProjectById } from "@/lib/demo-data";
import { getVenueProfileById } from "@/lib/venue-profiles";

export default async function WritingPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string }>;
}) {
  const { projectId } = await params;
  const { venue } = await searchParams;
  const project = getProjectById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="project-page-grid">
      <section className="content-card content-card--wide">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第四步</span>
          <h3>逐章写作页应该先把正文摆出来，再让你决定改哪里。</h3>
        </div>
        <p className="lead-text">
          这一页现在默认展示每章的正文草稿、备选写法和缺口提醒。你不是对着空框开始写，而是对着 AI 已经准备好的文本做选择和修改。
        </p>
      </section>

      <section className="content-card content-card--wide">
        <ChapterWritingStudio
          chapters={project.chapterDrafts}
          projectId={project.id}
          projectTitle={project.title}
          venueProfile={venueProfile}
          venueId={venue}
        />
      </section>

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
          <p>等正文区里每一章都点过“确认并存档”后，章节区底部会自动开放完整全文入口，这样全文整合才有稳定基线。</p>
        </div>
      </section>
    </div>
  );
}
