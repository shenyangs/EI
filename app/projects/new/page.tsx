"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { VenueRuleSelector } from "@/components/venue-rule-selector";

type AiAnalysisResult = {
  thinking: {
    thoughts: string;
    prompt: string;
    reasoning: string;
    confidence: number;
  };
  content: {
    content: string;
    sections: Record<string, string>;
    metadata: {
      wordCount: number;
      estimatedReadingTime: number;
      topics: string[];
    };
  };
  quality: {
    overallScore: number;
    criteria: Array<{
      name: string;
      score: number;
      feedback: string;
    }>;
    suggestions: string[];
    approved: boolean;
  };
  nextSteps: Array<{
    step: string;
    preview: string;
    estimatedTime: number;
  }>;
};

export default function NewProjectPage() {
  const [title, setTitle] = useState("非遗纹样驱动的智能服饰交互设计研究");
  const [subject, setSubject] = useState("智能服饰原型、传统纹样元素、试穿用户");
  const [keywords, setKeywords] = useState("非遗纹样, 智能服饰, 用户体验, 交互设计");
  const [description, setDescription] = useState("我想研究传统纹样如何进入智能服饰场景，并通过小规模用户测试验证文化识别度和交互体验。");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
          description,
          venueId
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "创建项目失败");
      }

      // 跳转到项目页面
      window.location.href = `/projects/${data.project.id}/profile?venue=${venueId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    // 当用户输入变化时，自动触发AI分析
    const timer = setTimeout(() => {
      if (title && description && !isAnalyzing) {
        analyzeWithAi();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, description, keywords, subject, venueId]);

  return (
    <main className="single-panel-page">
      <section className="hero-card hero-card--compact">
        <div className="page-intro page-intro--stack">
          <div>
            <span className="eyebrow">第 1 步 / 共 6 步</span>
            <h1>新建论文项目</h1>
            <p>AI 驱动的论文创作流程：输入你的研究想法，AI 会分析并生成相关建议，帮助你更好地规划论文。</p>
          </div>
          <Link className="secondary-button" href="/">
            返回项目首页
          </Link>
        </div>
        <div className="mobile-step-strip top-gap">
          <span className="wizard-step active">1 定主题和方向</span>
          <span className="wizard-step">2 AI 分析与建议</span>
          <span className="wizard-step">3 判断题目类型</span>
          <span className="wizard-step">4 拆论文框架</span>
          <span className="wizard-step">5 分章节写作</span>
          <span className="wizard-step">6 输出全文</span>
        </div>
      </section>

      <section className="form-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">研究主题</span>
          <h2>先告诉系统你想研究什么</h2>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span>论文主题</span>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <small>这是研究核心问题，后面的题目类型和框架都会基于它判断。</small>
          </label>

          <label className="field">
            <span>研究对象</span>
            <input 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
            />
            <small>比如服装产品、用户群体、文化元素、实验对象等。</small>
          </label>

          <label className="field field--full">
            <span>关键词</span>
            <input 
              value={keywords} 
              onChange={(e) => setKeywords(e.target.value)}
            />
            <small>先写你现在脑子里最确定的 3 到 5 个词，后面还能继续改。</small>
          </label>

          <label className="field field--full">
            <span>已有想法说明</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
            <small>这里写自然语言就行，不需要一开始就写成学术表达。</small>
          </label>

          {error && (
            <div className="field field--full">
              <div className="error-message">
                <strong>提示：</strong>{error}
                {error.includes("未授权") && (
                  <span className="error-hint">
                    请检查 AI 服务配置或稍后重试
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="field field--full">
            <button 
              type="button" 
              className="secondary-button button-spaced" 
              onClick={analyzeWithAi}
              disabled={isAnalyzing}
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
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">AI 分析结果</span>
            <h2>AI 对您研究主题的分析和建议</h2>
            <p>AI 已完成深度分析，包括思考过程、内容生成、质量检查和下一步预测。</p>
          </div>
          
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>AI 思考过程</strong>
              <div className="ai-thinking">
                <p>{aiAnalysis.thinking.thoughts}</p>
                <div className="ai-thinking-meta">
                  <strong>置信度：</strong>{aiAnalysis.thinking.confidence}/100
                </div>
              </div>
            </div>
            
            <div className="line-item line-item--column">
              <strong>研究主题分析</strong>
              <p>{aiAnalysis.content.content}</p>
              <div className="ai-metadata">
                <strong>字数：</strong>{aiAnalysis.content.metadata.wordCount} | 
                <strong>阅读时间：</strong>{aiAnalysis.content.metadata.estimatedReadingTime}分钟 | 
                <strong>主题：</strong>{aiAnalysis.content.metadata.topics.join(', ')}
              </div>
            </div>
            
            <div className="line-item line-item--column">
              <strong>质量评估</strong>
              <div className={`ai-quality-assessment ${aiAnalysis.quality.approved ? 'approved' : 'needs-improvement'}`}>
                <div className="ai-quality-header">
                  <strong>整体评分：</strong>{aiAnalysis.quality.overallScore}/100
                  <span className={`ai-quality-status ${aiAnalysis.quality.approved ? 'approved' : 'needs-improvement'}`}>
                    {aiAnalysis.quality.approved ? '通过' : '需改进'}
                  </span>
                </div>
              </div>
              <div className="ai-criteria-list">
                {aiAnalysis.quality.criteria.map((criterion, index) => (
                  <div key={index} className="ai-criteria-item">
                    <div className="ai-criteria-header">
                      <strong>{criterion.name}</strong>
                      <span>{criterion.score}/100</span>
                    </div>
                    <p className="ai-criteria-feedback">{criterion.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="line-item line-item--column">
              <strong>改进建议</strong>
              <ul className="ai-suggestions-list">
                {aiAnalysis.quality.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
            
            <div className="line-item line-item--column">
              <strong>提前预览：后续两步</strong>
              <div className="ai-next-steps">
                {aiAnalysis.nextSteps.map((step, index) => (
                  <div key={index} className="ai-next-step-item">
                    <div className="ai-next-step-header">
                      <strong>第 {index + 2} 步：{step.step}</strong>
                      <span className="ai-next-step-time">
                        {step.estimatedTime}分钟
                      </span>
                    </div>
                    <p className="ai-next-step-preview">{step.preview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="content-card">
        <div className="helper-banner helper-banner--stack">
          <div>
            <strong>AI 驱动的论文创作流程</strong>
            <p>AI 会分析你的研究想法，提供专业建议，并预测后续步骤的内容，帮助你更高效地完成论文。</p>
          </div>
          <Link className="secondary-button" href="/projects/atelier-zero/profile?venue=ieee-iccci-2026">
            看下一步示例
          </Link>
        </div>
      </section>

      <VenueRuleSelector 
        initialVenueId={venueId} 
        projectHref="/projects/atelier-zero" 
        onVenueChange={setVenueId}
      />
    </main>
  );
}
