import { notFound } from "next/navigation";

import { ChapterWritingStudio } from "@/components/chapter-writing-studio";
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
    <div className="workbench-stack writing-page">
      <section className="writing-command-deck writing-command-deck--stitch compact-stage-hero">
        <div className="writing-command-deck__main">
          <span className="eyebrow">Writing Studio</span>
          <h2 className="stitch-title-stack stitch-title-stack--tight">
            <span>逐章处理正文、</span>
            <span>证据和质量。</span>
          </h2>
          <p>
            左边切章节，中间写正文，右边看证据和质量。先把当前章节写稳，再进入全文整合。
          </p>
        </div>
        <aside className="writing-command-deck__rail">
          <div className="editorial-note-card editorial-note-card--accent">
            <span className="eyebrow">当前建议</span>
            <strong>先把单章写到可确认状态</strong>
            <p>每章先补齐内容、检查质量、确认材料，再进入全文整合。</p>
          </div>
        </aside>
      </section>

      <ChapterWritingStudio
        chapters={project.chapterDrafts}
        initialChapterId={chapter}
        projectId={project.id}
        projectTitle={project.title}
        references={project.references}
        assets={project.assets}
        checks={project.checks}
        venueProfile={venueProfile}
        venueId={venue}
      />
    </div>
  );
}
