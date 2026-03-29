"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/lib/client/admin-api";

interface AIModel {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: string;
}

interface SystemModelStatus {
  key: "minimax" | "gemini";
  name: string;
  provider: "minimax" | "google";
  model: string;
  baseUrl: string;
  configured: boolean;
  runtimeSelected: boolean;
  source: "system-default";
  status: {
    connected: boolean;
    configured: boolean;
    latencyMs: number | null;
    checkedAt: string;
    error: string | null;
  };
}

type FormState = {
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
};

const initialFormState: FormState = {
  name: "",
  provider: "minimax",
  model: "",
  baseUrl: "",
  apiKey: "",
  isDefault: false
};

const providerLabels: Record<string, string> = {
  minimax: "MiniMax",
  google: "Google / Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "自定义"
};

function formatLatency(latencyMs: number | null) {
  if (latencyMs == null) {
    return "暂未探测";
  }

  return `${latencyMs} ms`;
}

function getSystemModelBadge(model: SystemModelStatus) {
  if (!model.configured) {
    return { text: "未配置", className: "atelier-admin-badge atelier-admin-badge--quiet" };
  }

  if (model.status.connected) {
    return { text: "已连通", className: "atelier-admin-badge atelier-admin-badge--active" };
  }

  return { text: "未连通", className: "atelier-admin-badge atelier-admin-badge--danger" };
}

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [systemModels, setSystemModels] = useState<SystemModelStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchModels();
  }, []);

  const defaultModel = useMemo(
    () => models.find((model) => model.isDefault) ?? null,
    [models]
  );

  const connectedSystemCount = useMemo(
    () => systemModels.filter((model) => model.status.connected).length,
    [systemModels]
  );

  const runtimeSystemModel = useMemo(
    () => systemModels.find((model) => model.runtimeSelected) ?? null,
    [systemModels]
  );

  async function fetchModels() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/ai/models");
      if (!response.ok) {
        throw new Error("failed to fetch models");
      }

      const data = await response.json();
      setModels(Array.isArray(data.models) ? data.models : []);
      setSystemModels(Array.isArray(data.systemModels) ? data.systemModels : []);
      setFeedback(null);
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setFeedback("模型状态暂时没加载出来，你可以稍后刷新一次。管理员页面本身已经切到新界面了。");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const url = editingModel ? `/api/ai/models/${editingModel.id}` : "/api/ai/models";
      const method = editingModel ? "PUT" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      await fetchModels();
      setEditingModel(null);
      setFormData(initialFormState);
      setFeedback(editingModel ? "模型已更新。系统默认模型状态也已经同步刷新。" : "新模型已加入配置。系统默认模型状态也已经同步刷新。");
    } catch (error) {
      console.error("Failed to save model:", error);
      setFeedback("保存失败了。通常是接口没有响应，或者字段还不完整。");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(model: AIModel) {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      model: model.model,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      isDefault: model.isDefault
    });
    setFeedback(`已切换到“${model.name}”编辑模式。`);
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这个模型吗？")) {
      return;
    }

    try {
      const response = await adminFetch(`/api/ai/models/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("delete failed");
      }

      await fetchModels();
      if (editingModel?.id === id) {
        setEditingModel(null);
        setFormData(initialFormState);
      }
      setFeedback("模型已删除。系统默认状态已重新探测。");
    } catch (error) {
      console.error("Failed to delete model:", error);
      setFeedback("删除失败了，可能是这个模型正在被其他模块使用。");
    }
  }

  async function handleTestConnection(model: AIModel) {
    setFeedback(`正在测试 ${model.name} 的连通性...`);

    try {
      const response = await adminFetch("/api/ai/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ modelId: model.id })
      });

      if (!response.ok) {
        throw new Error("test failed");
      }

      const result = await response.json();
      setFeedback(
        result.success
          ? `连接成功：${model.name} 可用，延时 ${formatLatency(result.latencyMs)}。`
          : `连接失败：${result.error || "未知错误"}${result.latencyMs != null ? `，延时 ${formatLatency(result.latencyMs)}` : ""}`
      );
      await fetchModels();
    } catch (error) {
      console.error("Failed to test connection:", error);
      setFeedback("测试连接失败了。你可以先检查 API 地址和密钥是否完整。");
    }
  }

  function resetForm() {
    setEditingModel(null);
    setFormData(initialFormState);
    setFeedback("已退出编辑模式。");
  }

  return (
    <main className="atelier-admin-page">
      <section className="atelier-admin-hero">
        <div className="atelier-admin-hero__main">
          <div className="atelier-kicker-row">
            <span className="atelier-kicker">超级管理员</span>
            <span className="atelier-mark">模型路由与连接管理</span>
          </div>
          <h1>把系统默认模型和手工模型分开看清楚</h1>
          <p>
            这里现在会同时显示两类信息：一类是系统默认挂载的模型状态，一类是管理员手工录入的模型配置。这样你不会再看到“系统其实能跑，但列表却是 0 条配置”的误导。
          </p>
          <div className="atelier-admin-actions">
            <button className="atelier-button" type="button" onClick={() => void fetchModels()} disabled={loading}>
              {loading ? "刷新中..." : "刷新全部状态"}
            </button>
            <Link className="atelier-button atelier-button--ghost" href="/admin/ai-module-configs">
              去看功能模块分配
            </Link>
          </div>
        </div>

        <aside className="atelier-admin-hero__rail">
          <article className="content-card atelier-admin-stat-card">
            <span className="atelier-kicker">系统默认模型</span>
            <strong>{connectedSystemCount} / {systemModels.length || 2} 已连通</strong>
            <p>{runtimeSystemModel ? `当前系统运行默认：${runtimeSystemModel.name} / ${runtimeSystemModel.model}` : "当前还没有识别到系统运行默认模型。"}</p>
          </article>
          <article className="content-card atelier-admin-stat-card">
            <span className="atelier-kicker">手工配置模型</span>
            <strong>{models.length} 个</strong>
            <p>{defaultModel ? `数据库默认模型：${defaultModel.name}` : "还没有设置数据库默认模型。"}</p>
          </article>
        </aside>
      </section>

      <section className="content-card atelier-admin-list-card">
        <div className="atelier-panel__head">
          <div>
            <span className="atelier-kicker">系统默认</span>
            <h2>系统默认模型状态</h2>
          </div>
          <span className="atelier-mark">直接读取环境与实时探测结果</span>
        </div>

        {loading ? (
          <div className="atelier-admin-empty">系统默认模型状态加载中...</div>
        ) : (
          <div className="atelier-admin-system-model-grid">
            {systemModels.map((model) => {
              const badge = getSystemModelBadge(model);
              return (
                <article key={model.key} className="atelier-admin-system-model-card">
                  <div className="atelier-admin-system-model-card__head">
                    <div>
                      <h3>{model.name}</h3>
                      <p>{providerLabels[model.provider]} / {model.model}</p>
                    </div>
                    <div className="atelier-admin-system-model-card__badges">
                      <span className={badge.className}>{badge.text}</span>
                      {model.runtimeSelected ? <span className="atelier-admin-badge">当前系统默认</span> : null}
                    </div>
                  </div>

                  <dl className="atelier-admin-system-model-meta">
                    <div>
                      <dt>接口地址</dt>
                      <dd>{model.baseUrl}</dd>
                    </div>
                    <div>
                      <dt>实时延时</dt>
                      <dd>{formatLatency(model.status.latencyMs)}</dd>
                    </div>
                    <div>
                      <dt>配置来源</dt>
                      <dd>{model.configured ? "环境变量已配置" : "环境变量未配置"}</dd>
                    </div>
                    <div>
                      <dt>最近探测</dt>
                      <dd>{new Date(model.status.checkedAt).toLocaleString("zh-CN")}</dd>
                    </div>
                  </dl>

                  <p className="atelier-admin-system-model-card__note">
                    {model.status.connected
                      ? `接口可用，当前探测耗时 ${formatLatency(model.status.latencyMs)}。`
                      : model.configured
                        ? `接口未连通${model.status.error ? `：${model.status.error}` : "。"}`
                        : "这一路系统默认模型还没配好密钥，所以暂时无法探测。"}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="atelier-admin-grid">
        <section className="content-card atelier-admin-form-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">模型表单</span>
            <h2>{editingModel ? "编辑模型配置" : "添加新模型"}</h2>
            <p>只保留必要字段：显示名称、供应商、模型名、接口地址和密钥。</p>
          </div>

          <form className="atelier-admin-form" onSubmit={handleSubmit}>
            <label className="atelier-admin-field">
              <span>模型显示名称</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="例如：默认写作模型"
                required
              />
            </label>

            <div className="atelier-admin-two-col">
              <label className="atelier-admin-field">
                <span>供应商</span>
                <select name="provider" value={formData.provider} onChange={handleInputChange}>
                  <option value="minimax">MiniMax</option>
                  <option value="google">Google / Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义</option>
                </select>
              </label>

              <label className="atelier-admin-field">
                <span>模型名称</span>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="例如：MiniMax-M2.7"
                  required
                />
              </label>
            </div>

            <label className="atelier-admin-field">
              <span>API 基础地址</span>
              <input
                type="text"
                name="baseUrl"
                value={formData.baseUrl}
                onChange={handleInputChange}
                placeholder="例如：https://api.minimaxi.com/v1"
                required
              />
            </label>

            <label className="atelier-admin-field">
              <span>API Key</span>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="输入对应服务的密钥"
                required
              />
            </label>

            <label className="atelier-admin-check">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
              />
              <span>设为数据库默认模型</span>
            </label>

            <div className="atelier-admin-actions">
              <button className="atelier-button" type="submit" disabled={submitting}>
                {submitting ? "保存中..." : editingModel ? "更新模型" : "添加模型"}
              </button>
              {editingModel ? (
                <button className="atelier-button atelier-button--ghost" type="button" onClick={resetForm}>
                  取消编辑
                </button>
              ) : null}
            </div>
          </form>

          {feedback ? <div className="atelier-admin-note">{feedback}</div> : null}
        </section>

        <aside className="content-card atelier-admin-guide-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">一句话说明</span>
            <h2>系统默认模型负责真实运行，手工模型只做额外绑定</h2>
          </div>
          <p className="atelier-inline-note">
            先看上面的系统默认模型状态，再决定要不要在下面补手工模型；如果默认链路已经通了，手工列表为空也不代表系统不能用。
          </p>
          <div className="atelier-admin-actions">
            <Link className="atelier-button atelier-button--ghost" href="/admin/ai-module-configs">
              去功能模块绑定
            </Link>
          </div>
        </aside>
      </section>

      <section className="content-card atelier-admin-list-card">
        <div className="atelier-panel__head">
          <div>
            <span className="atelier-kicker">模型列表</span>
            <h2>手工配置模型</h2>
          </div>
          <span className="atelier-mark">{loading ? "正在刷新" : `${models.length} 条配置`}</span>
        </div>

        {loading ? (
          <div className="atelier-admin-empty">模型列表加载中...</div>
        ) : models.length === 0 ? (
          <div className="atelier-admin-empty">还没有任何手工模型配置。系统默认模型状态已经在上面单独显示。</div>
        ) : (
          <div className="atelier-admin-model-list">
            {models.map((model) => (
              <article key={model.id} className="atelier-admin-model-card">
                <div className="atelier-admin-model-card__main">
                  <div className="atelier-admin-model-card__top">
                    <div>
                      <h3>{model.name}</h3>
                      <p>{providerLabels[model.provider] ?? model.provider} / {model.model}</p>
                    </div>
                    {model.isDefault ? <span className="atelier-admin-badge">数据库默认模型</span> : null}
                  </div>

                  <dl className="atelier-admin-model-meta">
                    <div>
                      <dt>接口地址</dt>
                      <dd>{model.baseUrl}</dd>
                    </div>
                    <div>
                      <dt>创建时间</dt>
                      <dd>{new Date(model.createdAt).toLocaleString("zh-CN")}</dd>
                    </div>
                  </dl>
                </div>

                <div className="atelier-admin-model-card__actions">
                  <button
                    className="atelier-button atelier-button--ghost"
                    onClick={() => void handleTestConnection(model)}
                    type="button"
                  >
                    测试连接
                  </button>
                  <button
                    className="atelier-button atelier-button--ghost"
                    onClick={() => handleEdit(model)}
                    type="button"
                  >
                    编辑
                  </button>
                  <button
                    className="atelier-button atelier-admin-danger"
                    onClick={() => void handleDelete(model.id)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
