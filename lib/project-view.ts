import { cookies } from "next/headers";

import { demoProject, getProjectById, type DemoProject } from "@/lib/demo-data";
import { getSessionProjectById } from "@/lib/project-session";
import { getProject } from "@/lib/server/project-db";
import { getVenueProfileById } from "@/lib/venue-profiles";

function buildFlowSteps(projectId: string) {
  return demoProject.flowSteps.map((step, index) => ({
    ...step,
    href: step.href.replace(`/projects/${demoProject.id}`, `/projects/${projectId}`),
    done: index === 0
  }));
}

function buildKeywords(rawKeywords?: string) {
  if (!rawKeywords) {
    return demoProject.fullText.keywords;
  }

  const keywords = rawKeywords
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return keywords.length > 0 ? keywords : demoProject.fullText.keywords;
}

function buildSubtitle(subject?: string, description?: string) {
  if (subject?.trim()) {
    return subject.trim();
  }

  if (description?.trim()) {
    return description.trim().slice(0, 48);
  }

  return "从主题定义开始推进论文写作流程";
}

function buildProjectFromDatabase(project: NonNullable<Awaited<ReturnType<typeof getProject>>>): DemoProject {
  const venueProfile = getVenueProfileById(project.venueId);
  const projectTitle = project.title?.trim() || "未命名项目";
  const description = project.description?.trim();

  return {
    ...demoProject,
    id: project.id,
    title: projectTitle,
    subtitle: buildSubtitle(project.subject, description),
    conference: venueProfile.shortName,
    stage: "已确定主题方向",
    discipline: project.subject?.trim() || demoProject.discipline,
    progress: [
      { label: "主题方向", value: 100 },
      { label: "题目类型", value: 22 },
      { label: "论文框架", value: 12 },
      { label: "章节写作", value: 0 },
      { label: "全文导出", value: 0 }
    ],
    titleCandidates: [
      projectTitle,
      ...demoProject.titleCandidates.filter((item) => item !== projectTitle).slice(0, 2)
    ],
    flowSteps: buildFlowSteps(project.id),
    fullText: {
      ...demoProject.fullText,
      abstract: description || demoProject.fullText.abstract,
      keywords: buildKeywords(project.keywords)
    }
  };
}

export async function getProjectViewById(projectId: string): Promise<DemoProject | null> {
  const demo = getProjectById(projectId);
  if (demo) {
    return demo;
  }

  const storedProject = await getProject(projectId);
  if (storedProject) {
    return buildProjectFromDatabase(storedProject);
  }

  const cookieStore = await cookies();
  const sessionProject = getSessionProjectById(cookieStore, projectId);
  if (!sessionProject) {
    return null;
  }

  return buildProjectFromDatabase(sessionProject);
}
