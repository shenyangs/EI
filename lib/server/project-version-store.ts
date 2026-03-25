import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  CreateProjectVersionInput,
  ProjectVersionPayload,
  ProjectVersionRecord
} from "@/lib/project-version-types";

type ProjectVersionStore = {
  projectId: string;
  versions: ProjectVersionRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data", "project-versions");

function assertProjectId(projectId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error("非法项目 ID。");
  }
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

function getStoreFile(projectId: string) {
  assertProjectId(projectId);
  return path.join(DATA_DIR, `${projectId}.json`);
}

async function readStore(projectId: string): Promise<ProjectVersionStore> {
  await ensureDataDir();

  try {
    const raw = await readFile(getStoreFile(projectId), "utf8");
    const parsed = JSON.parse(raw) as ProjectVersionStore;

    return {
      projectId,
      versions: Array.isArray(parsed.versions) ? parsed.versions : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        projectId,
        versions: []
      };
    }

    throw error;
  }
}

async function writeStore(projectId: string, store: ProjectVersionStore) {
  await ensureDataDir();
  await writeFile(getStoreFile(projectId), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function sortVersions<TPayload extends ProjectVersionPayload>(
  versions: ProjectVersionRecord<TPayload>[]
) {
  return [...versions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function pruneVersions(versions: ProjectVersionRecord[]) {
  const grouped = new Map<string, number>();

  return sortVersions(versions).filter((version) => {
    const current = grouped.get(version.key) ?? 0;

    if (current >= 20) {
      return false;
    }

    grouped.set(version.key, current + 1);
    return true;
  });
}

export async function listProjectVersions(projectId: string, key?: string) {
  const store = await readStore(projectId);
  const versions = key ? store.versions.filter((version) => version.key === key) : store.versions;

  return sortVersions(versions);
}

export async function createProjectVersion<TPayload extends ProjectVersionPayload>(
  projectId: string,
  input: CreateProjectVersionInput<TPayload>
) {
  const store = await readStore(projectId);
  const existing = store.versions.find(
    (version) => version.key === input.key && version.fingerprint === input.fingerprint
  ) as ProjectVersionRecord<TPayload> | undefined;

  if (existing) {
    return existing;
  }

  const record: ProjectVersionRecord<TPayload> = {
    id: randomUUID(),
    projectId,
    key: input.key,
    title: input.title,
    summary: input.summary,
    fingerprint: input.fingerprint,
    createdAt: new Date().toISOString(),
    payload: input.payload
  };

  const nextStore: ProjectVersionStore = {
    projectId,
    versions: pruneVersions([record, ...store.versions])
  };

  await writeStore(projectId, nextStore);

  return record;
}
