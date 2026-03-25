"use client";

import { useEffect, useState } from "react";

export type ProjectArchiveRecord = {
  key: string;
  fingerprint: string;
  title: string;
  summary: string;
  archivedAt: string;
};

const STORAGE_PREFIX = "ei-project-archive:";

function buildStorageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readProjectArchive(projectId: string) {
  if (typeof window === "undefined") {
    return {} as Record<string, ProjectArchiveRecord>;
  }

  const raw = window.localStorage.getItem(buildStorageKey(projectId));

  if (!raw) {
    return {} as Record<string, ProjectArchiveRecord>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, ProjectArchiveRecord>;

    return parsed ?? {};
  } catch {
    return {} as Record<string, ProjectArchiveRecord>;
  }
}

function persistProjectArchive(projectId: string, records: Record<string, ProjectArchiveRecord>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(buildStorageKey(projectId), JSON.stringify(records));
}

export function createArchiveFingerprint(parts: Array<string | string[]>) {
  const joined = parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .map((item) => item.trim())
    .join("\u241f");

  let hash = 0;

  for (let index = 0; index < joined.length; index += 1) {
    hash = (hash * 31 + joined.charCodeAt(index)) | 0;
  }

  return `${joined.length.toString(16)}-${(hash >>> 0).toString(16)}`;
}

export function shortenArchiveText(text: string, maxLength = 84) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

export function formatArchiveTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function useProjectArchive(projectId: string) {
  const [records, setRecords] = useState<Record<string, ProjectArchiveRecord>>({});
  const [readyProjectId, setReadyProjectId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(readProjectArchive(projectId));
    setReadyProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (readyProjectId !== projectId) {
      return;
    }

    persistProjectArchive(projectId, records);
  }, [projectId, readyProjectId, records]);

  function archiveCurrent(input: Omit<ProjectArchiveRecord, "archivedAt">) {
    const record: ProjectArchiveRecord = {
      ...input,
      archivedAt: new Date().toISOString()
    };

    setRecords((current) => ({
      ...current,
      [input.key]: record
    }));

    return record;
  }

  function upsertRecord(record: ProjectArchiveRecord) {
    setRecords((current) => ({
      ...current,
      [record.key]: record
    }));
  }

  function getRecord(key: string) {
    return records[key] ?? null;
  }

  function matchesCurrent(key: string, fingerprint: string) {
    return records[key]?.fingerprint === fingerprint;
  }

  return {
    archiveCurrent,
    getRecord,
    isReady: readyProjectId === projectId,
    matchesCurrent,
    records
    ,
    upsertRecord
  };
}
