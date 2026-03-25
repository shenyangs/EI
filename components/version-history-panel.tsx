"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatArchiveTime } from "@/lib/project-archive";
import type { ProjectVersionPayload, ProjectVersionRecord } from "@/lib/project-version-types";

type VersionHistoryPanelProps<TPayload extends ProjectVersionPayload> = {
  title: string;
  description: string;
  versions: ProjectVersionRecord<TPayload>[];
  loading: boolean;
  error?: string;
  currentFingerprint: string;
  onRestore: (version: ProjectVersionRecord<TPayload>) => void;
};

export function VersionHistoryPanel<TPayload extends ProjectVersionPayload>({
  title,
  description,
  versions,
  loading,
  error,
  currentFingerprint,
  onRestore
}: VersionHistoryPanelProps<TPayload>) {
  return (
    <section className="content-card content-card--soft">
      <div className="card-heading card-heading--stack">
        <span className="eyebrow">版本历史</span>
        <h3>{title}</h3>
      </div>
      <p className="lead-text">{description}</p>

      {loading ? (
        <div className="hint-panel top-gap">
          <strong>正在读取历史版本</strong>
          <p>稍等一下，服务端正在把这一步以前确认过的版本拿回来。</p>
        </div>
      ) : null}

      {!loading && versions.length === 0 ? (
        <div className="hint-panel top-gap">
          <strong>还没有服务端历史</strong>
          <p>你第一次点“确认并存档”后，这里就会出现可回滚的版本记录。</p>
        </div>
      ) : null}

      {error ? (
        <div className="hint-panel top-gap">
          <strong>历史版本读取提醒</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && versions.length > 0 ? (
        <div className="version-history top-gap">
          {versions.map((version) => {
            const isCurrent = version.fingerprint === currentFingerprint;

            return (
              <div key={version.id} className="version-record">
                <div className="line-item__head">
                  <strong>{version.title}</strong>
                  <StatusBadge tone={isCurrent ? "sage" : "default"}>
                    {isCurrent ? "当前内容" : formatArchiveTime(version.createdAt)}
                  </StatusBadge>
                </div>
                <p>{version.summary}</p>
                <div className="button-row top-gap">
                  <button
                    className={isCurrent ? "secondary-button" : "primary-button"}
                    onClick={() => onRestore(version)}
                    type="button"
                  >
                    {isCurrent ? "当前已恢复到这一版" : "恢复到这一版"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
