"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";
import { SYSTEM_PROVIDER_MODEL_IDS } from "@/lib/ai/ai-client";

interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
}

interface SystemModelCard {
  key: "minimax" | "gemini";
  name: string;
  provider: "minimax" | "google";
  model: string;
  configured: boolean;
  runtimeSelected: boolean;
  baseUrl: string;
  source: "system-default";
}

interface AIModuleConfig {
  key: string;
  name: string;
  description: string;
  systemPreset: string;
  modelId: number | null;
  useAutomatic: boolean;
}

type ModuleMode = "system" | "gemini" | "minimax" | "custom";
type ProviderKey = "google" | "minimax";

type ProviderProbeState = {
  loading: boolean;
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
};

const PROVIDER_DISPLAY_ORDER: ProviderKey[] = ["minimax", "google"];

const INITIAL_PROVIDER_STATUS: Record<ProviderKey, ProviderProbeState> = {
  minimax: {
    loading: true,
    connected: false,
    latencyMs: null,
    error: null
  },
  google: {
    loading: true,
    connected: false,
    latencyMs: null,
    error: null
  }
};

export default function AIModuleConfigsPage() {
  const [modules, setModules] = useState<AIModuleConfig[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [systemModels, setSystemModels] = useState<SystemModelCard[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<ProviderKey, ProviderProbeState>>(INITIAL_PROVIDER_STATUS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const systemConnectedCount = PROVIDER_DISPLAY_ORDER.filter(
    (provider) => providerStatuses[provider].connected
  ).length;

  const statusSummaryParts = [
    `MiniMax：${getSystemStatusLabel("minimax")}`,
    `Gemini：${getSystemStatusLabel("google")}`
  ];

  const isAnyProviderLoading = PROVIDER_DISPLAY_ORDER.some(
    (provider) => providerStatuses[provider].loading
  );

  const systemStatusSummary = {
    countLabel: isAnyProviderLoading
      ? `${systemConnectedCount} / ${systemModels.length || 2} 已连通 · 持续探测中`
      : `${systemConnectedCount} / ${systemModels.length || 2} 已连通`,
    detailLabel: statusSummaryParts.join(" / ")
  };

  function getModuleMode(module: AIModuleConfig): ModuleMode {
    if (module.useAutomatic) {
      return "system";
    }

    if (module.modelId === SYSTEM_PROVIDER_MODEL_IDS.google) {
      return "gemini";
    }

    if (module.modelId === SYSTEM_PROVIDER_MODEL_IDS.minimax) {
      return "minimax";
    }

    return "custom";
  }

  function getSelectedCustomModelId(module: AIModuleConfig) {
    const mode = getModuleMode(module);
    if (mode !== "custom") {
      return "";
    }

    return module.modelId ?? "";
  }

  function getModeLabel(module: AIModuleConfig) {
    const mode = getModuleMode(module);
    if (mode === "system") {
      return `跟随系统预置 · ${module.systemPreset}`;
    }

    if (mode === "gemini") {
      return "固定走 Gemini";
    }

    if (mode === "minimax") {
      return "固定走 MiniMax";
    }

    if (module.modelId) {
      const model = models.find((item) => item.id === module.modelId);
      return model ? `固定走 ${model.name}` : "固定走自定义模型";
    }

    return "等待指定自定义模型";
  }

  const fetchProviderStatus = useCallback(async (provider: ProviderKey) => {
    setProviderStatuses((previous) => ({
      ...previous,
      [provider]: {
        ...previous[provider],
        loading: true,
        error: null
      }
    }));

    try {
      const response = await adminFetch(
        `/api/ai/system-model-status?provider=${provider}`
      );
      if (!response.ok) {
        throw new Error("status probe failed");
      }

      const data = await response.json();
      const status = data?.status;
      if (!status || status.provider !== provider) {
        throw new Error("status payload invalid");
      }

      setProviderStatuses((previous) => ({
        ...previous,
        [provider]: {
          loading: false,
          connected: Boolean(status.status?.connected),
          latencyMs:
            typeof status.status?.latencyMs === "number"
              ? status.status.latencyMs
              : null,
          error: status.status?.error ?? null
        }
      }));
    } catch (error) {
      console.error(`Failed to probe ${provider}:`, error);
      setProviderStatuses((previous) => ({
        ...previous,
        [provider]: {
          ...previous[provider],
          loading: false,
          connected: false,
          error: "探测失败"
        }
      }));
    }
  }, []);

  const refreshSystemStatuses = useCallback(async () => {
    for (const provider of PROVIDER_DISPLAY_ORDER) {
      void fetchProviderStatus(provider);
    }
  }, [fetchProviderStatus]);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch("/api/ai/module-configs");
      if (!response.ok) {
        throw new Error("failed to fetch configs");
      }

      const data = await response.json();
      setModules(Array.isArray(data.modules) ? data.modules : []);
      setModels(Array.isArray(data.models) ? data.models : []);
      setSystemModels(Array.isArray(data.systemModels) ? data.systemModels : []);
      setProviderStatuses((previous) => {
        const next = { ...previous };
        for (const provider of PROVIDER_DISPLAY_ORDER) {
          next[provider] = {
            ...previous[provider],
            loading: true,
            error: null
          };
        }
        return next;
      });
      void refreshSystemStatuses();
      setFeedback(null);
    } catch (error) {
      console.error("Failed to fetch configs:", error);
      setFeedback("模型切换页暂时没有加载出来。页面结构已经升级了，但这次接口没有成功返回。");
    } finally {
      setLoading(false);
    }
  }, [refreshSystemStatuses]);

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  function getSystemStatusLabel(provider: "google" | "minimax") {
    const card = systemModels.find((item) => item.provider === provider);
    if (!card?.configured) {
      return "未配置";
    }

    const status = providerStatuses[provider];
    if (status.loading) {
      return "探测中...";
    }

    if (status.connected) {
      return `已连通 · ${status.latencyMs ?? "--"} ms`;
    }

    return status.error ? "未连通" : "待探测";
  }

  async function handleSaveConfig(moduleKey: string, modelId: number | null, useAutomatic: boolean) {
    setSaving(moduleKey);
    setFeedback(null);

    try {
      const response = await adminFetch("/api/ai/module-configs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ moduleKey, modelId, useAutomatic })
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      await fetchConfigs();
      setFeedback("模型切换已更新。新的模块路由已经生效。");
    } catch (error) {
      console.error("Failed to save config:", error);
      setFeedback("保存失败了。你可以稍后重试，或者先检查系统默认模型是否已配置好。");
    } finally {
      setSaving(null);
    }
  }

  async function handleSwitchMode(module: AIModuleConfig, mode: ModuleMode) {
    if (mode === "system") {
      await handleSaveConfig(module.key, null, true);
      return;
    }

    if (mode === "gemini") {
      await handleSaveConfig(module.key, SYSTEM_PROVIDER_MODEL_IDS.google, false);
      return;
    }

    if (mode === "minimax") {
      await handleSaveConfig(module.key, SYSTEM_PROVIDER_MODEL_IDS.minimax, false);
      return;
    }

    const firstCustomModelId = models[0]?.id ?? null;
    await handleSaveConfig(module.key, firstCustomModelId, false);
  }

  return (
    <main className="atelier-admin-page">
      <section className="atelier-admin-hero">
        <div className="atelier-admin-hero__main">
          <div className="atelier-kicker-row">
            <span className="atelier-kicker">超级管理员</span>
            <span className="atelier-mark">逐块切换 AI 模型</span>
          </div>
          <h1>把每个 AI 功能拆开，单独决定走哪条模型链路</h1>
          <p>
            这页不再只是“自动分配”一个开关，而是把研究方向、主题分析、内容生成、评审、改稿、论文指导和 AI 思考拆成独立功能块。每块都可以选 Gemini、MiniMax、自定义模型，或者继续跟随系统预置分配。
          </p>
          <div className="atelier-admin-actions">
            <Link className="atelier-button" href="/admin/ai-models">
              去看模型状态
            </Link>
            <button className="atelier-button atelier-button--ghost" type="button" onClick={() => void fetchConfigs()} disabled={loading}>
              {loading ? "刷新中..." : "刷新切换状态"}
            </button>
          </div>
        </div>

        <aside className="atelier-admin-hero__rail">
          <article className="content-card atelier-admin-stat-card">
            <span className="atelier-kicker">系统预置链路</span>
            <strong>{systemStatusSummary.countLabel}</strong>
            <p>{systemStatusSummary.detailLabel}</p>
          </article>
          <article className="content-card atelier-admin-stat-card">
            <span className="atelier-kicker">自定义模型</span>
            <strong>{models.length} 个</strong>
            <p>{models.length > 0 ? "可把某些功能块固定绑到你手工录入的模型。" : "当前还没有手工模型，先去模型页录入后才能选自定义。"}</p>
          </article>
        </aside>
      </section>

      {feedback ? <section className="atelier-admin-note">{feedback}</section> : null}

      {loading ? (
        <section className="content-card atelier-admin-empty">模型切换页加载中...</section>
      ) : (
        <section className="atelier-admin-module-list">
          {modules.map((module) => {
            const mode = getModuleMode(module);
            const customModelId = getSelectedCustomModelId(module);
            const customUnavailable = models.length === 0;
            return (
              <article key={module.key} className="content-card atelier-admin-module-card atelier-admin-module-card--switcher">
                <div className="atelier-admin-module-card__head">
                  <div>
                    <span className="atelier-kicker">功能块</span>
                    <h2>{module.name}</h2>
                    <p>{module.description}</p>
                  </div>
                  <span className="atelier-admin-badge atelier-admin-badge--quiet">{getModeLabel(module)}</span>
                </div>

                <div className="atelier-admin-inline-note">
                  系统预置建议：{module.systemPreset}
                </div>

                <div className="atelier-admin-switch-grid">
                  <button
                    type="button"
                    className={mode === "system" ? "atelier-admin-switch-card active" : "atelier-admin-switch-card"}
                    onClick={() => void handleSwitchMode(module, "system")}
                    disabled={saving === module.key}
                  >
                    <strong>跟随系统预置</strong>
                    <span>默认推荐。系统会按任务类型走预置分配。</span>
                  </button>

                  <button
                    type="button"
                    className={mode === "gemini" ? "atelier-admin-switch-card active" : "atelier-admin-switch-card"}
                    onClick={() => void handleSwitchMode(module, "gemini")}
                    disabled={saving === module.key || !systemModels.find((item) => item.provider === "google")?.configured}
                  >
                    <strong>固定 Gemini</strong>
                    <span>{getSystemStatusLabel("google")}</span>
                  </button>

                  <button
                    type="button"
                    className={mode === "minimax" ? "atelier-admin-switch-card active" : "atelier-admin-switch-card"}
                    onClick={() => void handleSwitchMode(module, "minimax")}
                    disabled={saving === module.key || !systemModels.find((item) => item.provider === "minimax")?.configured}
                  >
                    <strong>固定 MiniMax</strong>
                    <span>{getSystemStatusLabel("minimax")}</span>
                  </button>

                  <button
                    type="button"
                    className={mode === "custom" ? "atelier-admin-switch-card active" : "atelier-admin-switch-card"}
                    onClick={() => void handleSwitchMode(module, "custom")}
                    disabled={saving === module.key || customUnavailable}
                  >
                    <strong>固定自定义模型</strong>
                    <span>{customUnavailable ? "当前没有可用的自定义模型" : "从你手工录入的模型里挑一个固定绑定"}</span>
                  </button>
                </div>

                <div className="atelier-admin-module-card__controls atelier-admin-module-card__controls--single">
                  <label className="atelier-admin-field atelier-admin-field--select">
                    <span>自定义模型</span>
                    <select
                      value={customModelId}
                      onChange={(event) => {
                        void handleSaveConfig(module.key, event.target.value ? parseInt(event.target.value, 10) : null, false);
                      }}
                      disabled={mode !== "custom" || customUnavailable || saving === module.key}
                    >
                      <option value="">选择自定义模型...</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="atelier-admin-module-card__status">
                    {saving === module.key
                      ? "保存中..."
                      : mode === "system"
                        ? "当前走系统预置分配，不需要你手工维护。"
                        : mode === "custom"
                          ? customModelId
                            ? "这个功能块将固定使用你选中的自定义模型。"
                            : "你已经切到自定义模式，请再明确指定一个模型。"
                          : "这个功能块将固定走对应的系统模型链路。"}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="atelier-admin-grid atelier-admin-grid--notes">
        <section className="content-card atelier-admin-guide-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">推荐做法</span>
            <h2>什么时候继续跟系统预置</h2>
          </div>
          <ul className="atelier-bullets">
            <li>你还在试运行，先让系统按预置逻辑稳定工作。</li>
            <li>当前目标是少维护、多跑通，而不是追求每个块都手调。</li>
            <li>你还没有完成 Gemini、MiniMax、自定义模型之间的长期对比。</li>
          </ul>
        </section>

        <section className="content-card atelier-admin-guide-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">手动绑定</span>
            <h2>什么时候适合固定到某个模型</h2>
          </div>
          <ul className="atelier-bullets">
            <li>某个功能块对风格或稳定性特别敏感，比如正文长文生成。</li>
            <li>你已经实测过，知道 Gemini 或 MiniMax 在这一类任务上更稳。</li>
            <li>你想把特定场景固定到自定义模型，方便做成本或效果控制。</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
