"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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

  async function analyzeWithAi() {
    setIsAnalyzing(true);
    setError("");
    let timeoutId: NodeJS.Timeout | null = null;

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
      
      if (typeof AbortController !== "undefined") {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 30000);
        requestOptions.signal = controller.signal;
      }
      
      const response = await fetch("/api/ai/think", requestOptions);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "AI 分析失败");
      }

      setAiAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 分析失败");
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

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "AI 填充失败");
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
      setError(err instanceof Error ? err.message : "AI 填充失败");
    } finally {
      setAiFilling(prev => ({ ...prev, [field]: false }));
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

      if (!response.ok) {
        throw new Error("创建项目失败");
      }

      const data = await response.json();

      if (data.ok && data.projectId) {
        window.location.href = `/projects/${data.projectId}/outline`;
      } else {
        throw new Error("创建项目失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败");
    } finally {
      setIsSubmitting(false);
    }
  }

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
                type="button"
                className="secondary-button"
                onClick={analyzeWithAi}
                disabled={isAnalyzing || !title.trim()}
              >
                {isAnalyzing ? "AI 分析中..." : "AI 分析我的想法"}
              </button>
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

        {aiAnalysis && (
          <section className="content-card">
            <div className="card-heading">
              <span className="eyebrow">AI 分析结果</span>
              <h2>AI 对您研究主题的分析和建议</h2>
              <p>AI 已完成深度分析，包括研究方向和建议。</p>
            </div>
            
            <div className="stack-list">
              <div className="line-item line-item--column">
                <strong>研究主题分析</strong>
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
                          <span>置信度: {direction.confidence}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
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
      `}</style>
    </main>
  );
}
