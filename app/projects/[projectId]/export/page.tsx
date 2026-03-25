import Link from "next/link";
import { notFound } from "next/navigation";

import { FullTextPreview } from "@/components/fulltext-preview";
import { StatusBadge } from "@/components/status-badge";
import { getProjectById } from "@/lib/demo-data";
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
  const project = getProjectById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="project-page-grid">
      <section className="content-card content-card--wide">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">第五步</span>
          <h3>这里不该只有“最后检查”，而是应该先把完整全文给你看。</h3>
        </div>
        <p className="lead-text">
          我已经把全文预览默认展开。你现在进入这一页，先看到完整论文，再看哪些地方要改，而不是只看到几个空检查项。
        </p>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">导出前检查</span>
          <h3>该改的地方也一起明说</h3>
        </div>
        <div className="stack-list">
          {project.checks.map((item) => (
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
            </div>
          ))}
        </div>
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

      <section className="content-card content-card--wide">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">完整全文预览</span>
          <h3>先看稿，再决定导出</h3>
        </div>
        <FullTextPreview
          abstract={project.fullText.abstract}
          keywords={project.fullText.keywords}
          projectId={project.id}
          projectTitle={project.title}
          sections={project.fullText.sections}
          venueProfile={venueProfile}
        />
      </section>
    </div>
  );
}
