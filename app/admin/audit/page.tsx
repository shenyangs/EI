"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type AuditLog = {
  id: string;
  action: string;
  category: "权限" | "系统" | "AI" | "安全";
  severity: "提示" | "重要" | "高风险";
  actor: string;
  target: string;
  detail: string;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState({ total: 0, highRisk: 0, important: 0, latest: null as string | null });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudit() {
      setLoading(true);
      try {
        const response = await adminFetch("/api/admin/audit");
        if (!response.ok) throw new Error("failed to fetch audit");
        const data = await response.json();
        setLogs(data.logs || []);
        setSummary(data.summary || { total: 0, highRisk: 0, important: 0, latest: null });
        setFeedback(null);
      } catch (error) {
        console.error(error);
        setFeedback("审计日志暂时没加载出来。通常是超管 token 失效，或者后台刚刚重启。");
      } finally {
        setLoading(false);
      }
    }

    void fetchAudit();
  }, []);

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      <section className="atelier-admin-grid atelier-admin-grid--notes">
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">日志总数</span>
          <strong>{summary.total} 条</strong>
          <p>超管、系统与关键配置变更都会沉到这里。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">高风险</span>
          <strong>{summary.highRisk} 条</strong>
          <p>停用账号、删除模型、系统级修改都属于重点关注对象。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">重要变更</span>
          <strong>{summary.important} 条</strong>
          <p>权限调整、系统配置调整会出现在这里。</p>
        </article>
        <article className="content-card atelier-admin-stat-card">
          <span className="atelier-kicker">最近一条</span>
          <strong>{summary.latest ? new Date(summary.latest).toLocaleString("zh-CN") : "暂无"}</strong>
          <p>帮助你先判断最近有没有超管动作。</p>
        </article>
      </section>

      <section className="content-card atelier-admin-list-card">
        <div className="atelier-panel__head atelier-panel__head--stack">
          <span className="atelier-kicker">审计日志</span>
          <h2>权限、系统和安全动作都应该留下痕迹</h2>
        </div>

        {loading ? (
          <div className="atelier-admin-empty">审计日志加载中...</div>
        ) : (
          <div className="atelier-admin-diagnostics-list">
            {logs.map((log) => (
              <article key={log.id} className="atelier-admin-diagnostic-card">
                <div>
                  <strong>{log.action}</strong>
                  <p>{log.detail}</p>
                  <small>{log.actor} -&gt; {log.target} / {new Date(log.createdAt).toLocaleString("zh-CN")}</small>
                </div>
                <span className={log.severity === "高风险" ? "atelier-admin-badge" : "atelier-admin-badge atelier-admin-badge--quiet"}>
                  {log.category} · {log.severity}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
