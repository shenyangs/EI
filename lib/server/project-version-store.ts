import { getDatabase } from './db';
import type {
  CreateProjectVersionInput,
  ProjectVersionPayload,
  ProjectVersionRecord
} from "@/lib/project-version-types";

export async function listProjectVersions(projectId: string, key?: string) {
  const db = await getDatabase();
  const query = key
    ? 'SELECT * FROM project_versions WHERE projectId = ? AND key = ? ORDER BY createdAt DESC'
    : 'SELECT * FROM project_versions WHERE projectId = ? ORDER BY createdAt DESC';
  const params = key ? [projectId, key] : [projectId];

  const versions = await db.all<any[]>(query, params);
  return versions.map(v => ({
    id: v.id.toString(),
    projectId: v.projectId,
    key: v.key,
    title: v.title,
    summary: v.summary,
    fingerprint: v.fingerprint,
    createdAt: new Date(v.createdAt).toISOString(),
    payload: JSON.parse(v.payload)
  }));
}

export async function createProjectVersion<TPayload extends ProjectVersionPayload>(
  projectId: string,
  input: CreateProjectVersionInput<TPayload>
) {
  const db = await getDatabase();
  
  // 检查是否已存在相同的版本
  const existing = await db.get<any>(
    'SELECT * FROM project_versions WHERE projectId = ? AND key = ? AND fingerprint = ?',
    [projectId, input.key, input.fingerprint]
  );

  if (existing) {
    return {
      id: existing.id.toString(),
      projectId: existing.projectId,
      key: existing.key,
      title: existing.title,
      summary: existing.summary,
      fingerprint: existing.fingerprint,
      createdAt: new Date(existing.createdAt).toISOString(),
      payload: JSON.parse(existing.payload)
    };
  }

  // 插入新版本
  const now = Date.now();
  await db.run(
    'INSERT INTO project_versions (projectId, key, fingerprint, title, summary, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [projectId, input.key, input.fingerprint, input.title, input.summary, JSON.stringify(input.payload), now]
  );

  return {
    id: db.lastID.toString(),
    projectId,
    key: input.key,
    title: input.title,
    summary: input.summary,
    fingerprint: input.fingerprint,
    createdAt: new Date(now).toISOString(),
    payload: input.payload
  };
}