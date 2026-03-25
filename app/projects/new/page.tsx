"use client";

import Link from "next/link";
import { useState } from "react";

import { VenueRuleSelector } from "@/components/venue-rule-selector";

export default function NewProjectPage() {
  const [title, setTitle] = useState("非遗纹样驱动的智能服饰交互设计研究");
  const [subject, setSubject] = useState("智能服饰原型、传统纹样元素、试穿用户");
  const [keywords, setKeywords] = useState("非遗纹样, 智能服饰, 用户体验, 交互设计");
  const [description, setDescription] = useState("我想研究传统纹样如何进入智能服饰场景，并通过小规模用户测试验证文化识别度和交互体验。");
  const [venueId, setVenueId] = useState("ieee-iccci-2026");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <main className="single-panel-page">
      <section className="hero-card hero-card--compact">
        <div className="page-intro page-intro--stack">
          <div>
            <span className="eyebrow">第 1 步 / 共 5 步</span>
            <h1>新建论文项目</h1>
            <p>第一步只做两件事：定研究主题，选投稿规则。等这一步明确了，后面再继续判断题目类型、拆框架和逐章写作。</p>
          </div>
          <Link className="secondary-button" href="/">
            返回项目首页
          </Link>
        </div>
        <div className="mobile-step-strip top-gap">
          <span className="wizard-step active">1 定主题和方向</span>
          <span className="wizard-step">2 判断题目类型</span>
          <span className="wizard-step">3 拆论文框架</span>
          <span className="wizard-step">4 分章节写作</span>
          <span className="wizard-step">5 输出全文</span>
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
              <div style={{ color: 'var(--rose)', margin: '8px 0' }}>
                {error}
              </div>
            </div>
          )}

          <div className="field field--full">
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

      <section className="content-card">
        <div className="helper-banner helper-banner--stack">
          <div>
            <strong>不知道该归到哪种论文路线，也没关系。</strong>
            <p>移动版把判断题目类型单独放到下一步。你先把主题和规则定住，再让系统给出几种可选路线。</p>
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
