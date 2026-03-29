import { notFound } from "next/navigation";

import { ChapterWritingStudio } from "@/components/chapter-writing-studio";
import { getPublicSystemRuntime } from "@/lib/server/admin-governance";
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
  const systemRuntime = getPublicSystemRuntime();

  if (!project) {
    notFound();
  }

  return (
    <div className="atelier-writing">
      <section className="atelier-writing__hero">
        <div className="atelier-writing__copy">
          <span className="atelier-kicker">Writing Studio</span>
          <h2>逐章写作、逐章检查、逐章确认。</h2>
          <p>左边切章节，中间写正文，右边看证据与风险。先把当前章节写稳，再进入全文整合。</p>
        </div>
        <aside className="atelier-writing__note">
          <span className="atelier-kicker">当前建议</span>
          <strong>先把单章写到可确认状态</strong>
          <p>每章先补齐内容、跑自检、确认材料，再进入全文整合。</p>
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
        aiAutoFillEnabled={systemRuntime.aiAutoFillEnabled}
        venueProfile={venueProfile}
        venueId={venue}
      />
    </div>
  );
}
