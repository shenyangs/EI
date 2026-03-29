import { notFound } from "next/navigation";

import { getProjectViewById } from "@/lib/project-view";
import ReferencesContent from "./ReferencesContent";

export default async function ReferencesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectViewById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack references-page references-page--stitch">
      <section className="decision-stage-hero">
        <div className="decision-stage-hero__main">
          <span className="eyebrow">Evidence & References</span>
          <h2>把文献、图表和章节需求真正对齐，不让证据管理变成附件仓库。</h2>
          <p>
            这一页负责管理引用、图文材料和格式约束。它的目标不是“堆材料”，而是让你看清楚哪些章节还缺支持证据。
          </p>
        </div>
        <aside className="decision-stage-hero__rail">
          <div className="stitch-brief-card">
            <span className="eyebrow">当前项目</span>
            <strong>{project.title}</strong>
            <p>文献和材料补强后，写作页与全文页的判断才会更稳。</p>
          </div>
        </aside>
      </section>

      <ReferencesContent projectId={projectId} />
    </div>
  );
}
