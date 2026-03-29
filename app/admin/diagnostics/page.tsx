"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

type DiagnosticsPayload = {
  ai: {
    model: string;
    provider: string;
    hasApiKey: boolean;
    canGeneratePaperDraft: boolean;
    canUseWebSearch: boolean;
    modelStatus: string;
    searchStatus: string;
  };
  data: {
    userCount: number;
    projectCount: number;
    modelCount: number;
    moduleConfigCount: number;
  };
  routes: Array<{
    key: string;
    label: string;
    state: string;
    note: string;
  }>;
  plannedModules: string[];
  environment: {
    hasMiniMaxKey: boolean;
    webSearchEnabled: boolean;
    currentModel: string;
    currentProvider: string;
  };
};

export default function AdminDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiagnostics() {
      setLoading(true);
      try {
        const response = await adminFetch('/api/admin/diagnostics');
        if (!response.ok) {
          throw new Error('failed to fetch diagnostics');
        }

        const data = await response.json();
        setDiagnostics(data.diagnostics);
        setFeedback(null);
      } catch (error) {
        console.error('Failed to fetch diagnostics:', error);
        setFeedback('运行诊断暂时没加载出来。优先检查超级管理员 token 是否已进入，或者本地服务是否刚重启。');
      } finally {
        setLoading(false);
      }
    }

    void fetchDiagnostics();
  }, []);

  return (
    <div className="atelier-admin-overview">
      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading || !diagnostics ? (
        <section className="content-card atelier-admin-empty">运行诊断加载中...</section>
      ) : (
        <>
          <section className="atelier-admin-grid atelier-admin-grid--notes">
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">AI 模型</span>
              <strong>{diagnostics.ai.modelStatus}</strong>
              <p>{diagnostics.ai.provider} / {diagnostics.ai.model}</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">联网检索</span>
              <strong>{diagnostics.ai.searchStatus}</strong>
              <p>{diagnostics.ai.canUseWebSearch ? '联网能力已开启。' : '当前还没有可用联网能力。'}</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">项目数据</span>
              <strong>{diagnostics.data.projectCount} 个</strong>
              <p>当前内存里已经有的项目数量。</p>
            </article>
            <article className="content-card atelier-admin-stat-card">
              <span className="atelier-kicker">账号数据</span>
              <strong>{diagnostics.data.userCount} 个</strong>
              <p>包括系统超管与普通注册用户。</p>
            </article>
          </section>

          <section className="atelier-admin-grid">
            <section className="content-card atelier-admin-list-card">
              <div className="atelier-panel__head atelier-panel__head--stack">
                <span className="atelier-kicker">关键诊断项</span>
                <h2>先看哪里是通的，哪里还没补齐</h2>
              </div>
              <div className="atelier-admin-diagnostics-list">
                {diagnostics.routes.map((route) => (
                  <article key={route.key} className="atelier-admin-diagnostic-card">
                    <div>
                      <strong>{route.label}</strong>
                      <p>{route.note}</p>
                    </div>
                    <span className={route.state === '正常' ? 'atelier-admin-badge' : 'atelier-admin-badge atelier-admin-badge--quiet'}>
                      {route.state}
                    </span>
                  </article>
                ))}
              </div>
            </section>

            <aside className="atelier-admin-hero__rail">
              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">当前环境</span>
                  <h2>影响系统是否能工作的几个关键点</h2>
                </div>
                <ul className="atelier-bullets">
                  <li>MiniMax Key：{diagnostics.environment.hasMiniMaxKey ? '已配置' : '未配置'}</li>
                  <li>联网搜索：{diagnostics.environment.webSearchEnabled ? '已开启' : '未开启'}</li>
                  <li>当前模型：{diagnostics.environment.currentProvider} / {diagnostics.environment.currentModel}</li>
                  <li>模型配置数：{diagnostics.data.modelCount} 个</li>
                  <li>模块分配数：{diagnostics.data.moduleConfigCount} 条</li>
                </ul>
              </section>

              <section className="content-card atelier-admin-guide-card">
                <div className="atelier-panel__head atelier-panel__head--stack">
                  <span className="atelier-kicker">后续诊断</span>
                  <h2>还应该继续补上的监控项</h2>
                </div>
                <div className="atelier-admin-chip-list">
                  {diagnostics.plannedModules.map((item) => (
                    <span key={item} className="atelier-admin-badge atelier-admin-badge--quiet">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
