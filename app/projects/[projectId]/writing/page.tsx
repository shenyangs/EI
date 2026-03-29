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
      <section className="writing-command-deck writing-command-deck--stitch">
        <div className="writing-command-deck__main">
          <span className="eyebrow">Writing Studio</span>
          <h2>逐章处理正文、证据和质量，不再把写作与检查割裂开。</h2>
          <p>
            这页现在是完整的写作工作台。左边切章节，中间写正文，右边看质量、证据和引用支持。先把当前章节写稳，再决定是否进入全文页。
          </p>
        </div>
        <aside className="writing-command-deck__rail">
          <div className="editorial-note-card editorial-note-card--accent">
            <span className="eyebrow">进入全文前</span>
            <strong>先把单章写到可确认状态</strong>
            <p>等每一章都补齐内容、检查质量、确认材料后，再进入全文整合，整体质量会更稳定。</p>
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
