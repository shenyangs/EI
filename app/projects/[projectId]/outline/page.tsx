import { notFound } from "next/navigation";

import { OutlineWorkbench } from "@/components/outline-workbench";
import { getProjectViewById } from "@/lib/project-view";

export default async function OutlinePage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string; title?: string; direction?: string; directionId?: string }>;
}) {
  const { projectId } = await params;
  const { venue, title, direction, directionId } = await searchParams;
  const project = await getProjectViewById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <OutlineWorkbench
      projectId={project.id}
      venueId={venue}
      projectTitle={title || project.title}
      selectedDirection={direction ? {
        id: directionId || "direction-1",
        label: direction,
        description: ""
      } : undefined}
    />
  );
}
