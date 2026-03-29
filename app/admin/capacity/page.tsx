"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type CapacityPayload = {
  cards: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  runtime: {
    connectedModelCount: number;
    averageLatencyMs: number;
    systemModels: Array<{
      name: string;
      connected: boolean;
      latencyMs: number | null;
      runtimeSelected: boolean;
    }>;
  };
  dataFootprint: {
    userCount: number;
    activeProjectCount: number;
    archivedProjectCount: number;
    versionCount: number;
    referenceCount: number;
    versionsPerProject: string;
    referencesPerProject: string;
  };
  notes: {
    immediate: string[];
    staged: string[];
  };
};

function formatLatency(latencyMs: number | null) {
  if (latencyMs == null) return "暂未探测";
  return `${latencyMs} ms`;
}

export default function AdminCapacityPage() {
  const [data, setData] = useState<CapacityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void fetchCapacity();
  }, []);

  async function fetchCapacity() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/capacity");
      if (!response.ok) throw new Error("failed to fetch capacity");
      const payload = await response.json();
      setData(payload);
      setFeedback(null);
    } catch (error) {
      console.error(error);
      setFeedback("成本与容量统计暂时没加载出来。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading || !data ? (
        <section className="content-card atelier-admin-empty">成本与容量统计加载中...</section>
      ) : (
        <>
          <section className="atelier-admin-grid atelier-admin-grid--notes">
            {data.cards.map((card) => (
              <article key={card.label} className="content-card atelier-admin-stat-card">
                <span className="atelier-kicker">{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </article>
            ))}
          </section>

          <section className="atelier-admin-grid">
            <section className="content-card atelier-admin-list-card">
              <div className="atelier-panel__head atelier-panel__head--stack">
                <span className="atelier-kicker">运行压力</span>
                <h2>先看当前系统压力落在哪几块</h2>
              </div>
              <div className="atelier-admin-role-list">
                <article className="atelier-admin-role-card">
                  <div>
                    <strong>系统已连通模型</strong>
                    <span>{data.runtime.connectedModelCount} 条系统默认模型链路可用。</span>
                  </div>
                  <span className="atelier-admin-badge atelier-admin-badge--quiet">{data.runtime.connectedModelCount} 条</span>
                </article>
                <article className="atelier-admin-role-card">
                  <div>
                    <strong>平均探测延时</strong>
                    <span>当前两条系统模型链路的平均响应速度。</span>
                  </div>
                  <span className="atelier-admin-badge atelier-admin-badge--quiet">{data.runtime.averageLatencyMs} ms</span>
                </article>
                {data.runtime.systemModels.map((model) => (
                  <article key={model.name} className="atelier-admin-role-card">
                    <div>
                      <strong>{model.name}</strong>
                      <span>{model.runtimeSelected ? "当前系统默认优先链路" : "当前作为辅助链路存在"}</span>
                    </div>
                    <span className={model.connected ? "atelier-admin-badge" : "atelier-admin-badge atelier-admin-badge--danger"}>
                      {model.connected ? formatLatency(model.latencyMs) : "未连通"}
                    </span>
                  </article>
                ))}
              </div>
            </section>

            <aside className="atelier-admin-hero__rail">
              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">数据体量</span>
                  <h2>当前这套系统已经装了多少东西</h2>
                </div>
                <ul className="atelier-bullets">
                  <li>账号：{data.dataFootprint.userCount} 个</li>
                  <li>运行中项目：{data.dataFootprint.activeProjectCount} 个</li>
                  <li>归档项目：{data.dataFootprint.archivedProjectCount} 个</li>
                  <li>版本快照：{data.dataFootprint.versionCount} 份</li>
                  <li>文献条目：{data.dataFootprint.referenceCount} 条</li>
                  <li>平均每项目版本：{data.dataFootprint.versionsPerProject}</li>
                  <li>平均每项目文献：{data.dataFootprint.referencesPerProject}</li>
                </ul>
              </section>

              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">说明</span>
                  <h2>这页现在为什么不直接给你账单金额</h2>
                </div>
                <ul className="atelier-bullets">
                  {data.notes.immediate.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <ul className="atelier-bullets">
                  {data.notes.staged.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
