import { getDatabase } from './db';
import type { ProjectVersionPayload } from '@/lib/project-version-types';

export type Project = {
  id: string;
  title: string;
  subject?: string;
  keywords?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  venueId?: string;
};

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const db = await getDatabase();
  const id = project.id || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  await db.run(
    'INSERT INTO projects (id, title, subject, keywords, description, createdAt, updatedAt, venueId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, project.title, project.subject, project.keywords, project.description, now, now, project.venueId]
  );

  return await getProject(id);
}

export async function getProject(id: string) {
  const db = await getDatabase();
  return await db.get('SELECT * FROM projects WHERE id = ?', [id]) as Project | null;
}

export async function getProjects() {
  const db = await getDatabase();
  return await db.all('SELECT * FROM projects ORDER BY updatedAt DESC') as Project[];
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const db = await getDatabase();
  const now = Date.now();

  const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt');
  if (fields.length === 0) {
    return await getProject(id);
  }

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = [...fields.map(field => updates[field as keyof Project]), now, id];

  await db.run(
    `UPDATE projects SET ${setClause}, updatedAt = ? WHERE id = ?`,
    values
  );

  return await getProject(id);
}

export async function deleteProject(id: string) {
  const db = await getDatabase();
  await db.run('DELETE FROM projects WHERE id = ?', [id]);
  return true;
}

export async function saveProjectVersion(projectId: string, version: {
  key: string;
  fingerprint: string;
  title: string;
  summary?: string;
  payload: ProjectVersionPayload;
}) {
  const db = await getDatabase();
  const now = Date.now();

  await db.run(
    'INSERT INTO project_versions (projectId, key, fingerprint, title, summary, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [projectId, version.key, version.fingerprint, version.title, version.summary, JSON.stringify(version.payload), now]
  );

  return {
    id: db.lastID,
    projectId,
    ...version,
    createdAt: now
  };
}

export async function getProjectVersions(projectId: string, key?: string) {
  const db = await getDatabase();
  const query = key
    ? 'SELECT * FROM project_versions WHERE projectId = ? AND key = ? ORDER BY createdAt DESC'
    : 'SELECT * FROM project_versions WHERE projectId = ? ORDER BY createdAt DESC';
  const params = key ? [projectId, key] : [projectId];

  const versions = await db.all(query, params);
  return versions.map(v => ({
    ...v,
    payload: JSON.parse(v.payload)
  }));
}
