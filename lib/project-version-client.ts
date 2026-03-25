"use client";

import { useEffect, useState } from "react";

import type {
  CreateProjectVersionInput,
  ProjectVersionPayload,
  ProjectVersionRecord
} from "@/lib/project-version-types";

type ListResponse<TPayload extends ProjectVersionPayload> = {
  ok: boolean;
  versions?: ProjectVersionRecord<TPayload>[];
  error?: string;
};

type CreateResponse<TPayload extends ProjectVersionPayload> = {
  ok: boolean;
  version?: ProjectVersionRecord<TPayload>;
  error?: string;
};

async function requestJson<TResponse>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store"
  });

  return (await response.json()) as TResponse;
}

export async function listProjectVersions<TPayload extends ProjectVersionPayload>(
  projectId: string,
  key: string
) {
  const result = await requestJson<ListResponse<TPayload>>(
    `/api/projects/${projectId}/versions?key=${encodeURIComponent(key)}`
  );

  if (!result.ok) {
    throw new Error(result.error ?? "读取版本记录失败。");
  }

  return result.versions ?? [];
}

export async function createProjectVersion<TPayload extends ProjectVersionPayload>(
  projectId: string,
  input: CreateProjectVersionInput<TPayload>
) {
  const result = await requestJson<CreateResponse<TPayload>>(`/api/projects/${projectId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!result.ok || !result.version) {
    throw new Error(result.error ?? "保存版本失败。");
  }

  return result.version;
}

export function useProjectVersionHistory<TPayload extends ProjectVersionPayload>(
  projectId: string,
  key: string
) {
  const [versions, setVersions] = useState<ProjectVersionRecord<TPayload>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);

    try {
      const nextVersions = await listProjectVersions<TPayload>(projectId, key);

      setVersions(nextVersions);
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "读取版本记录失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [projectId, key]);

  async function saveVersion(input: CreateProjectVersionInput<TPayload>) {
    setSaving(true);

    try {
      const version = await createProjectVersion(projectId, input);

      setVersions((current) => {
        const next = current.filter((item) => item.id !== version.id);
        return [version, ...next];
      });
      setError("");
      return version;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "保存版本失败。";

      setError(message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  return {
    error,
    loading,
    refresh,
    saveVersion,
    saving,
    versions
  };
}
