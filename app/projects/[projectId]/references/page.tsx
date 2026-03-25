import ReferencesContent from "./ReferencesContent";

export default async function ReferencesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <div className="project-shell">
      <ReferencesContent projectId={projectId} />
    </div>
  );
}
