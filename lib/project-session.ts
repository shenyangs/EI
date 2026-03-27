import type { ProjectCardItem } from "@/lib/demo-data";
import type { Project } from "@/lib/server/project-db";
import { getVenueProfileById } from "@/lib/venue-profiles";

const PROJECT_SESSION_COOKIE = "ei_recent_projects";
const MAX_SESSION_PROJECTS = 6;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      maxAge?: number;
    }
  ): void;
};

function sanitizeText(value: string | undefined, maxLength: number) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeProject(project: Project): Project {
  return {
    id: project.id,
    title: sanitizeText(project.title, 120) || "未命名项目",
    subject: sanitizeText(project.subject, 120),
    keywords: sanitizeText(project.keywords, 180),
    description: sanitizeText(project.description, 400),
    createdAt: Number(project.createdAt) || Date.now(),
    updatedAt: Number(project.updatedAt) || Date.now(),
    venueId: sanitizeText(project.venueId, 80)
  };
}

function parseProjects(rawValue: string | undefined): Project[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Project => Boolean(item && typeof item.id === "string" && typeof item.title === "string"))
      .map(normalizeProject);
  } catch {
    return [];
  }
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  }

  return `${Math.max(1, Math.floor(diff / day))} 天前`;
}

export function readSessionProjects(cookieStore: CookieReader): Project[] {
  return parseProjects(cookieStore.get(PROJECT_SESSION_COOKIE)?.value);
}

export function getSessionProjectById(cookieStore: CookieReader, projectId: string) {
  return readSessionProjects(cookieStore).find((project) => project.id === projectId) ?? null;
}

export function persistSessionProject(cookieStore: CookieWriter & CookieReader, project: Project) {
  const normalizedProject = normalizeProject(project);
  const existingProjects = readSessionProjects(cookieStore).filter((item) => item.id !== normalizedProject.id);
  const nextProjects = [normalizedProject, ...existingProjects].slice(0, MAX_SESSION_PROJECTS);

  cookieStore.set(PROJECT_SESSION_COOKIE, JSON.stringify(nextProjects), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function buildProjectCardItem(project: Project): ProjectCardItem {
  const venueProfile = getVenueProfileById(project.venueId);
  const subtitle = project.subject?.trim() || project.description?.trim() || "从主题定义开始推进论文写作流程";

  return {
    id: project.id,
    title: project.title,
    subtitle: subtitle.slice(0, 48),
    conference: venueProfile.shortName,
    venueId: project.venueId,
    available: true,
    stage: "已确定主题方向",
    updatedAt: formatRelativeTime(Number(project.updatedAt) || Date.now()),
    accent: "amber"
  };
}
