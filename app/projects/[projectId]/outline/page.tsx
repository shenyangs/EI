import { notFound } from "next/navigation";

import { OutlineWorkbench } from "@/components/outline-workbench";
import { getProjectViewById } from "@/lib/project-view";
import { getVenueProfileById } from "@/lib/venue-profiles";

export default async function OutlinePage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    venue?: string;
    title?: string;
    direction?: string;
    directionId?: string;
    directionDescription?: string;
  }>;
}) {
  const { projectId } = await params;
  const { venue, title, direction, directionId, directionDescription } = await searchParams;
  const project = await getProjectViewById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack outline-page outline-page--stitch">
      <section className="decision-stage-hero">
        <div className="decision-stage-hero__main">
          <span className="eyebrow">Outline Architecture</span>
          <h2>先把论文骨架锁稳，再进入逐章写作。</h2>
          <p>
            这页负责把你确认过的研究方向翻译成可写的结构。当前标题、摘要、章节目标和章节顺序，都应该在这里先说清楚。
          </p>
        </div>
        <aside className="decision-stage-hero__rail">
          <div className="stitch-brief-card">
            <span className="eyebrow">当前约束</span>
            <strong>{venueProfile.shortName}</strong>
            <p>{direction ? `已采用方向：${direction}` : "建议先确认研究方向，再继续细化框架。"}</p>
          </div>
        </aside>
      </section>

      <OutlineWorkbench
        projectId={project.id}
        venueId={venue}
        projectTitle={title || project.title}
        selectedDirection={direction ? {
          id: directionId || "direction-1",
          label: direction,
          description: directionDescription || ""
        } : undefined}
      />
    </div>
  );
}
