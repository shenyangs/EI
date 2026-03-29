"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type AlertItem = {
  severity: "提示" | "重要" | "高风险";
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
};

type AlertsPayload = {
  summary: {
    total: number;
    highRisk: number;
    important: number;
    hint: number;
  };
  alerts: AlertItem[];
};

function badgeClass(severity: AlertItem["severity"]) {
  if (severity === "高风险") return "atelier-admin-badge atelier-admin-badge--danger";
  if (severity === "重要") return "atelier-admin-badge";
  return "atelier-admin-badge atelier-admin-badge--quiet";
}

export default function AdminRiskAlertsPage() {
  const [data, setData] = useState<AlertsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/risk-alerts");
      if (!response.ok) throw new Error("failed to fetch alerts");
      const payload = await response.json();
      setData(payload);
      setFeedback(null);
    } catch (error) {
      console.error(error);
      setFeedback("风险告警暂时没加载出来。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading || !data ? (
        <section className="content-card atelier-admin-empty">风险告警加载中...</section>
      ) : (
        <>
          <section className="atelier-admin-grid atelier-admin-grid--notes">
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">总告警</span>
              <strong>{data.summary.total} 条</strong>
              <p>当前超管最值得先看的后台风险。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">高风险</span>
              <strong>{data.summary.highRisk} 条</strong>
              <p>优先处理，不然会直接影响系统可靠性。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">重要</span>
              <strong>{data.summary.important} 条</strong>
              <p>会影响体验、效率或后台治理质量。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">提示</span>
              <strong>{data.summary.hint} 条</strong>
              <p>不是故障，但值得顺手收口。</p>
            </article>
          </section>

          <section className="content-card atelier-admin-list-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">风险告警</span>
              <h2>别让管理员自己猜问题在哪里</h2>
            </div>
            <div className="atelier-admin-role-list">
              {data.alerts.length === 0 ? (
                <div className="atelier-admin-empty">当前没有需要处理的风险告警。</div>
              ) : (
                data.alerts.map((alert) => (
                  <article key={`${alert.severity}-${alert.title}`} className="atelier-admin-role-card">
                    <div>
                      <strong>{alert.title}</strong>
                      <span>{alert.detail}</span>
                    </div>
                    <div className="atelier-admin-actions atelier-admin-actions--stack">
                      <span className={badgeClass(alert.severity)}>{alert.severity}</span>
                      <Link className="atelier-button atelier-button--ghost" href={alert.href}>
                        {alert.actionLabel}
                      </Link>
                    </div>
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
