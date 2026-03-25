import { notFound } from "next/navigation";

import { OutlineWorkbench } from "@/components/outline-workbench";
import { getProjectById } from "@/lib/demo-data";

export default async function OutlinePage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string }>;
}) {
  const { projectId } = await params;
  const { venue } = await searchParams;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <OutlineWorkbench
      outline={project.outline}
      packages={project.titlePackages}
      projectId={project.id}
      venueId={venue}
    />
  );
}
