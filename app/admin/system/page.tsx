"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type FeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
  note: string;
};

type SystemConfig = {
  allowRegistration: boolean;
  defaultPaperType: string;
  defaultVenuePolicy: string;
  webSearchEnabled: boolean;
  aiAutoFillEnabled: boolean;
  adminAuditEnabled: boolean;
  featureFlags: FeatureFlag[];
};

export default function AdminSystemPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [notes, setNotes] = useState<{ immediate: string[]; staged: string[] }>({ immediate: [], staged: [] });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/system");
      if (!response.ok) throw new Error("failed to fetch system config");
      const data = await response.json();
      setConfig(data.config);
      setNotes(data.notes || { immediate: [], staged: [] });
      setFeedback(null);
    } catch (error) {
      console.error(error);
      setFeedback("系统配置暂时没加载出来。");
    } finally {
      setLoading(false);
    }
  }

  async function toggleField(field: keyof Omit<SystemConfig, "featureFlags" | "defaultPaperType" | "defaultVenuePolicy">) {
    if (!config) return;
    setSaving(true);
    try {
      const response = await adminFetch("/api/admin/system", {
        method: "PATCH",
        body: JSON.stringify({ [field]: !config[field] })
      });
      if (!response.ok) throw new Error("update failed");
      const data = await response.json();
      setConfig(data.config);
      setFeedback("系统配置已更新。");
    } catch (error) {
      console.error(error);
      setFeedback("更新系统配置失败了。");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(flag: FeatureFlag) {
    if (!config) return;
    const nextFlags = config.featureFlags.map((item) =>
      item.key === flag.key ? { ...item, enabled: !item.enabled } : item
    );

    setSaving(true);
    try {
      const response = await adminFetch("/api/admin/system", {
        method: "PATCH",
        body: JSON.stringify({ featureFlags: nextFlags })
      });
      if (!response.ok) throw new Error("update flags failed");
      const data = await response.json();
      setConfig(data.config);
      setFeedback(`已更新功能开关“${flag.label}”。`);
    } catch (error) {
      console.error(error);
      setFeedback("更新功能开关失败了。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading || !config ? (
        <section className="content-card atelier-admin-empty">系统配置加载中...</section>
      ) : (
        <>
          <section className="atelier-admin-grid">
            <section className="content-card atelier-admin-list-card">
              <div className="atelier-panel__head atelier-panel__head--stack">
                <span className="atelier-kicker">系统配置</span>
                <h2>哪些开关已经可以调，哪些还是策略层配置</h2>
              </div>

              <div className="atelier-admin-role-list">
                <article className="atelier-admin-role-card">
                  <div>
                    <strong>公开注册入口</strong>
                    <span>决定系统是否允许新用户自行注册。</span>
                  </div>
                  <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleField("allowRegistration")} disabled={saving}>
                    {config.allowRegistration ? "关闭" : "开启"}
                  </button>
                </article>

                <article className="atelier-admin-role-card">
                  <div>
                    <strong>联网搜索能力</strong>
                    <span>决定系统是否默认允许联网辅助搜索。</span>
                  </div>
                  <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleField("webSearchEnabled")} disabled={saving}>
                    {config.webSearchEnabled ? "关闭" : "开启"}
                  </button>
                </article>

                <article className="atelier-admin-role-card">
                  <div>
                    <strong>AI 自动补全</strong>
                    <span>决定新建项目页和正文页是否默认开放 AI 自动补全。</span>
                  </div>
                  <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleField("aiAutoFillEnabled")} disabled={saving}>
                    {config.aiAutoFillEnabled ? "关闭" : "开启"}
                  </button>
                </article>

                <article className="atelier-admin-role-card">
                  <div>
                    <strong>后台审计日志</strong>
                    <span>决定超管关键变更是否写入审计日志。</span>
                  </div>
                  <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleField("adminAuditEnabled")} disabled={saving}>
                    {config.adminAuditEnabled ? "关闭" : "开启"}
                  </button>
                </article>
              </div>
            </section>

            <aside className="atelier-admin-hero__rail">
              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">立即生效</span>
                  <h2>已经接到系统里的配置</h2>
                </div>
                <ul className="atelier-bullets">
                  {notes.immediate.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">策略层</span>
                  <h2>已经进入后台，但下一步再接到主站</h2>
                </div>
                <ul className="atelier-bullets">
                  {notes.staged.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </section>

          <section className="content-card atelier-admin-list-card">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">Feature Flag</span>
              <h2>这些开关用来控制新能力是否逐步开放</h2>
            </div>
            <div className="atelier-admin-role-list">
              {config.featureFlags.map((flag) => (
                <article key={flag.key} className="atelier-admin-role-card">
                  <div>
                    <strong>{flag.label}</strong>
                    <span>{flag.note}</span>
                  </div>
                  <button type="button" className="atelier-button atelier-button--ghost" onClick={() => void toggleFlag(flag)} disabled={saving}>
                    {flag.enabled ? "关闭" : "开启"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
