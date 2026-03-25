import { notFound } from "next/navigation";

import { TopicDirectionSelector } from "@/components/topic-direction-selector";
import { getProjectById } from "@/lib/demo-data";

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string; title?: string }>;
}) {
  const { projectId } = await params;
  const { venue, title } = await searchParams;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <TopicDirectionSelector
      projectId={project.id}
      venueId={venue}
      projectTitle={title || project.title}
    />
  );
}
