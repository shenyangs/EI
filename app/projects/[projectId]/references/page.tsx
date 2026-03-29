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
      <section className="decision-stage-hero compact-stage-hero">
        <div className="decision-stage-hero__main">
          <span className="eyebrow">Evidence & References</span>
          <h2>把文献、图表和章节需求真正对齐。</h2>
          <p>
            这一页不只是堆材料，而是帮助你判断哪些章节还缺支持证据。
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

      <ReferencesContent projectId={projectId} projectTitle={project.title} />
    </div>
  );
}
