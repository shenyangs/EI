"use client";

import { useEffect, useRef, useState } from "react";

import { VenueRuleSelector } from "@/components/venue-rule-selector";

type AiAnalysisResult = {
  ok: boolean;
  content: {
    content: string;
    sections?: Record<string, string>;
    metadata: {
      analysis?: string;
      directions?: Array<{
        id: string;
        label: string;
        description: string;
        confidence: number;
      }>;
      wordCount?: number;
      estimatedReadingTime?: number;
      topics?: string[];
    };
  };
  error?: string;
};

function getFriendlyAiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "AI 分析失败";

  if (message.includes("504")) {
    return "AI 分析超时了，请稍后重试。系统没有丢数据，只是这次模型返回太慢。";
  }

  if (message.includes("AbortError") || message.includes("超时")) {
    return "AI 响应时间过长，请稍后再试。";
  }

  if (message.includes("Failed to fetch")) {
    return "网络连接异常，暂时无法调用 AI，请稍后再试。";
  }

  return message;
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type CreateProjectResponse = {
  ok: boolean;
  project?: {
    id: string;
    venueId?: string;
  };
  error?: string;
};

export default function NewProjectPage() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [aiFilling, setAiFilling] = useState<Record<string, boolean>>({});
  const [venueId, setVenueId] = useState("ieee-iccci-2026");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const analysisRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aiAnalysis) {
      return;
    }

    analysisRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [aiAnalysis]);

  async function analyzeWithAi() {
    setIsAnalyzing(true);
    setError("");

    try {
      const requestOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          taskType: "project_initialization",
          context: {
            projectId: "new",
            projectTitle: title,
            venueId: venueId,
            currentStep: "project_creation",
            previousSteps: [],
            userInputs: {
              title,
              subject,
              keywords,
              description,
              venueId
            }
          }
        })
      };

      const response = await fetch("/api/ai/think", requestOptions);
      const data = await parseJsonSafely<AiAnalysisResult>(response);

      if (!response.ok) {
        throw new Error(data?.error || `AI 分析请求失败（${response.status}）`);
      }

      if (!data?.ok) {
        throw new Error(data?.error || "AI 分析失败");
      }

      setAiAnalysis(data);
    } catch (err) {
      setAiAnalysis(null);
      setError(getFriendlyAiErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function fillWithAi(field: string, currentValue: string) {
    setAiFilling(prev => ({ ...prev, [field]: true }));
    setError("");

    try {
      const response = await fetch("/api/ai/think", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          taskType: "fill_field",
          context: {
            field,
            currentValue,
            projectId: "new",
            projectTitle: title,
            venueId: venueId,
            currentStep: "project_creation",
            previousSteps: [],
            userInputs: {
              title,
              subject,
              keywords,
              description,
              venueId
            }
          }
        })
      });

      const data = await parseJsonSafely<AiAnalysisResult>(response);

      if (!response.ok) {
        throw new Error(data?.error || `AI 填充请求失败（${response.status}）`);
      }

      if (!data?.ok) {
        throw new Error(data?.error || "AI 填充失败");
      }

      switch (field) {
        case "title":
          setTitle(data.content.sections?.title || data.content.content);
          break;
        case "subject":
          setSubject(data.content.sections?.subject || data.content.content);
          break;
        case "keywords":
          setKeywords(data.content.sections?.keywords || data.content.content);
          break;
        case "description":
          setDescription(data.content.sections?.description || data.content.content);
          break;
      }
    } catch (err) {
      setError(getFriendlyAiErrorMessage(err));
    } finally {
      setAiFilling(prev => ({ ...prev, [field]: false }));
    }
  }

  async function fillAllWithAi() {
    if (!title.trim()) {
      setError("请先输入研究主题");
      return;
    }

    setAiFilling({ title: true, subject: true, keywords: true, description: true });
    setError("");

    try {
      // 先填充研究对象
      await fillWithAi("subject", subject);
      // 再填充关键词
      await fillWithAi("keywords", keywords);
      // 最后填充研究描述
      await fillWithAi("description", description);
    } catch (err) {
      setError(getFriendlyAiErrorMessage(err));
    } finally {
      setAiFilling({});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("请输入研究主题");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          subject,
          keywords,
          description,
          venueId
        })
      });
      const data = await parseJsonSafely<CreateProjectResponse>(response);

      if (!response.ok) {
        throw new Error(data?.error || `创建项目失败（${response.status}）`);
      }

      if (data?.ok && data.project?.id) {
        const targetVenueId = data.project.venueId || venueId;
        window.location.href = `/projects/${data.project.id}/outline?venue=${encodeURIComponent(targetVenueId)}`;
      } else {
        throw new Error(data?.error || "项目创建接口没有返回有效的项目编号。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAiBusy = isAnalyzing || Object.values(aiFilling).some(Boolean);

  return (
    <main className="page-main">
      <section className="hero-card">
        <div className="page-intro">
          <h1>创建新项目</h1>
          <p>填写以下信息来创建一个新的论文项目，AI 将为您提供智能分析和建议。</p>
        </div>
      </section>

      <div className="workbench-stack">
        <section className="content-card">
          <div className="card-heading">
            <h2>项目基本信息</h2>
          </div>

          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label htmlFor="title">研究主题 <span className="required">*</span></label>
              <div className="input-with-button">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入研究主题"
                  required
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fillWithAi("title", title)}
                  disabled={aiFilling.title}
                >
                  {aiFilling.title ? "AI 填写中..." : "AI 填写"}
                </button>
              </div>
            </div>

            <div className="ai-assist-panel">
              <div className="ai-assist-copy">
                <strong>先让 AI 帮你整理思路</strong>
                <p>建议先输入研究主题，再点“分析想法”看方向建议；如果你已经确定主题，也可以直接一键补全下面几个字段。</p>
              </div>
              <div className="ai-assist-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={analyzeWithAi}
                  disabled={isAiBusy || !title.trim()}
                >
                  {isAnalyzing ? "AI 分析中..." : "AI 分析我的想法"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fillAllWithAi}
                  disabled={isAiBusy || !title.trim()}
                >
                  {Object.values(aiFilling).some(Boolean) ? "AI 补全中..." : "AI 一键补全其余内容"}
                </button>
              </div>
            </div>

            {aiAnalysis && (
              <div ref={analysisRef} className="ai-analysis-panel">
                <div className="card-heading card-heading--stack">
                  <span className="eyebrow">AI 分析结果</span>
                  <h3>AI 觉得你的想法可以往这些方向走</h3>
                  <p>先看整体判断，再挑最顺手的方向继续往下写。</p>
                </div>

                <div className="stack-list top-gap">
                  <div className="line-item line-item--column">
                    <strong>整体判断</strong>
                    <p>{aiAnalysis.content.content}</p>
                  </div>

                  {aiAnalysis.content.metadata.directions && aiAnalysis.content.metadata.directions.length > 0 && (
                    <div className="line-item line-item--column">
                      <strong>建议研究方向</strong>
                      <div className="direction-list">
                        {aiAnalysis.content.metadata.directions.map((direction, index) => (
                          <div key={direction.id} className="direction-item">
                            <h4>{index + 1}. {direction.label}</h4>
                            <p>{direction.description}</p>
                            <div className="direction-meta">
                              <span>匹配度: {direction.confidence}/100</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="subject">研究对象</label>
              <div className="input-with-button">
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="请输入研究对象"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fillWithAi("subject", subject)}
                  disabled={aiFilling.subject}
                >
                  {aiFilling.subject ? "AI 填写中..." : "AI 填写"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="keywords">关键词</label>
              <div className="input-with-button">
                <input
                  id="keywords"
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="请输入关键词，用逗号分隔"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fillWithAi("keywords", keywords)}
                  disabled={aiFilling.keywords}
                >
                  {aiFilling.keywords ? "AI 填写中..." : "AI 填写"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">研究描述</label>
              <div className="input-with-button">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请简要描述您的研究内容和目标"
                  rows={4}
                ></textarea>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fillWithAi("description", description)}
                  disabled={aiFilling.description}
                >
                  {aiFilling.description ? "AI 填写中..." : "AI 填写"}
                </button>
              </div>
            </div>

            <VenueRuleSelector
              selectedVenueId={venueId}
              onVenueChange={setVenueId}
            />

            {error && (
              <div className="form-error">
                <p>{error}</p>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "创建中..." : "创建项目"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <style jsx>{`
        .ai-assist-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          border-radius: 20px;
          background: rgba(248, 251, 255, 0.92);
          border: 1px solid rgba(214, 225, 243, 0.95);
          grid-column: 1 / -1;
        }

        .ai-assist-copy {
          display: grid;
          gap: 6px;
        }

        .ai-assist-copy p {
          margin: 0;
          color: #60738d;
        }

        .ai-assist-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .ai-analysis-panel {
          display: grid;
          gap: 16px;
          padding: 20px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(214, 225, 243, 0.95);
          grid-column: 1 / -1;
        }

        .input-with-button {
          display: flex;
          gap: 8px;
        }

        .input-with-button input,
        .input-with-button textarea {
          flex: 1;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .direction-list {
          margin-top: 12px;
        }

        .direction-item {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .direction-item h4 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .direction-item p {
          margin: 0 0 8px 0;
          color: #666;
        }

        .direction-meta {
          font-size: 14px;
          color: #888;
        }

        @media (max-width: 900px) {
          .ai-assist-panel {
            align-items: flex-start;
            flex-direction: column;
          }

          .ai-assist-actions {
            justify-content: flex-start;
          }

          .input-with-button {
            flex-direction: column;
          }

          .form-actions {
            justify-content: stretch;
          }
        }
      `}</style>
    </main>
  );
}
