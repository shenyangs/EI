"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type GovernanceProject = {
  id: string;
  title: string;
  venueId: string;
  updatedAt: string;
  versionCount: number;
  referenceCount: number;
  archived: boolean;
  archiveReason: string | null;
  archivedAt: string | null;
};

type GovernancePayload = {
  summary: {
    activeProjectCount: number;
    archivedProjectCount: number;
    projectVersionCount: number;
    referenceCount: number;
    staleProjectCount: number;
  };
  activeProjects: GovernanceProject[];
  archivedProjects: GovernanceProject[];
  notes: {
    immediate: string[];
    staged: string[];
  };
};

export default function AdminDataGovernancePage() {
  const [data, setData] = useState<GovernancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  useEffect(() => {
    void fetchGovernance();
  }, []);

  async function fetchGovernance() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/data-governance");
      if (!response.ok) throw new Error("failed to fetch governance");
      const payload = await response.json();
      setData({
        summary: payload.summary,
        activeProjects: payload.activeProjects,
        archivedProjects: payload.archivedProjects,
        notes: payload.notes
      });
      setFeedback(null);
    } catch (error) {
      console.error(error);
      setFeedback("数据治理页暂时没加载出来，通常是超管 token 丢了或者本地服务刚重启。");
    } finally {
      setLoading(false);
    }
  }

  async function mutateProject(projectId: string, action: "archive" | "restore") {
    setBusyProjectId(projectId);
    try {
      const response = await adminFetch("/api/admin/data-governance", {
        method: "PATCH",
        body: JSON.stringify({
          action,
          projectId,
          reason: action === "archive" ? "进入归档池，暂时从主站列表隐藏" : undefined
        })
      });
      if (!response.ok) throw new Error("mutation failed");
      const payload = await response.json();
      setData({
        summary: payload.summary,
        activeProjects: payload.activeProjects,
        archivedProjects: payload.archivedProjects,
        notes: payload.notes
      });
      setFeedback(payload.message);
    } catch (error) {
      console.error(error);
      setFeedback(action === "archive" ? "项目归档失败了。" : "项目恢复失败了。");
    } finally {
      setBusyProjectId(null);
    }
  }

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading || !data ? (
        <section className="content-card atelier-admin-empty">数据治理加载中...</section>
      ) : (
        <>
          <section className="atelier-admin-grid atelier-admin-grid--notes">
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">运行中项目</span>
              <strong>{data.summary.activeProjectCount} 个</strong>
              <p>仍然在主站项目列表里可见。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">归档池</span>
              <strong>{data.summary.archivedProjectCount} 个</strong>
              <p>已隐藏但可恢复，不会丢正文与版本。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">版本快照</span>
              <strong>{data.summary.projectVersionCount} 份</strong>
              <p>用于回看和恢复写作过程。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">久未更新</span>
              <strong>{data.summary.staleProjectCount} 个</strong>
              <p>超过 14 天没有推进的运行中项目。</p>
            </article>
          </section>

          <section className="atelier-admin-grid">
            <section className="content-card atelier-admin-list-card">
              <div className="atelier-panel__head atelier-panel__head--stack">
                <span className="atelier-kicker">运行中项目</span>
                <h2>先看哪些项目还在主站里继续推进</h2>
              </div>
              <div className="atelier-admin-role-list">
                {data.activeProjects.length === 0 ? (
                  <div className="atelier-admin-empty">当前没有运行中的项目。</div>
                ) : (
                  data.activeProjects.map((project) => (
                    <article key={project.id} className="atelier-admin-role-card">
                      <div>
                        <strong>{project.title}</strong>
                        <span>{project.venueId}</span>
                        <small>
                          最近更新 {project.updatedAt} / 版本 {project.versionCount} / 文献 {project.referenceCount}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="atelier-button atelier-button--ghost"
                        onClick={() => void mutateProject(project.id, "archive")}
                        disabled={busyProjectId === project.id}
                      >
                        {busyProjectId === project.id ? "处理中..." : "归档项目"}
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="atelier-admin-hero__rail">
              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">当前规则</span>
                  <h2>这页现在真正负责什么</h2>
                </div>
                <ul className="atelier-bullets">
                  {data.notes.immediate.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">下一步</span>
                  <h2>后面可以再补的恢复能力</h2>
                </div>
                <ul className="atelier-bullets">
                  {data.notes.staged.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </section>

          <section className="content-card atelier-admin-list-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">归档池</span>
              <h2>这些项目已经从主站隐藏，但随时可以恢复</h2>
            </div>
            <div className="atelier-admin-role-list">
              {data.archivedProjects.length === 0 ? (
                <div className="atelier-admin-empty">还没有进入归档池的项目。</div>
              ) : (
                data.archivedProjects.map((project) => (
                  <article key={project.id} className="atelier-admin-role-card">
                    <div>
                      <strong>{project.title}</strong>
                      <span>{project.archiveReason || "管理员手动归档"}</span>
                      <small>
                        归档于 {project.archivedAt ? new Date(project.archivedAt).toLocaleString() : "未知时间"} / 版本 {project.versionCount} / 文献 {project.referenceCount}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="atelier-button atelier-button--ghost"
                      onClick={() => void mutateProject(project.id, "restore")}
                      disabled={busyProjectId === project.id}
                    >
                      {busyProjectId === project.id ? "处理中..." : "恢复项目"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
