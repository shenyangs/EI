import { notFound } from "next/navigation";

import { TopicDirectionSelector } from "@/components/topic-direction-selector";
import { getProjectViewById } from "@/lib/project-view";
import { getVenueProfileById } from "@/lib/venue-profiles";

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string; title?: string }>;
}) {
  const { projectId } = await params;
  const { venue, title } = await searchParams;
  const project = await getProjectViewById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack profile-page profile-page--stitch">
      <section className="decision-stage-hero">
        <div className="decision-stage-hero__main">
          <span className="eyebrow">Research Direction</span>
          <h2>先选一条研究路线，再让后面的标题、框架和写作都沿这条线推进。</h2>
          <p>
            这一页负责把“我有一个研究想法”变成“我决定按哪种方式继续写”。选中的方向会影响后面的结构、摘要和章节重点。
          </p>
        </div>
        <aside className="decision-stage-hero__rail">
          <div className="stitch-brief-card">
            <span className="eyebrow">当前项目</span>
            <strong>{title || project.title}</strong>
            <p>{venueProfile.shortName} 会作为后续结构和写作判断的约束条件。</p>
          </div>
        </aside>
      </section>

      <TopicDirectionSelector
        projectId={project.id}
        venueId={venue}
        projectTitle={title || project.title}
      />
    </div>
  );
}
