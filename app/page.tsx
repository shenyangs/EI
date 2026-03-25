"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProjectCard } from "@/components/project-card";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { projectCards } from "@/lib/demo-data";

import type { ProjectCardItem } from "@/lib/demo-data";

type Project = ProjectCardItem;

export default function HomePage() {
  const [ai, setAi] = useState({
    provider: "minimax" as const,
    model: "MiniMax-M2.7",
    baseUrl: "https://api.minimaxi.com/v1",
    hasApiKey: false,
    webSearchEnabled: true,
    webSearchMode: "minimax_mcp" as const,
    canGeneratePaperDraft: false,
    canUseWebSearch: false
  });

  useEffect(() => {
    async function fetchAiStatus() {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setAi({
            provider: data.provider,
            model: data.model,
            baseUrl: data.baseUrl,
            hasApiKey: data.hasApiKey,
            webSearchEnabled: data.webSearchEnabled,
            webSearchMode: data.webSearchMode,
            canGeneratePaperDraft: data.canGeneratePaperDraft,
            canUseWebSearch: data.canUseWebSearch
          });
        }
      } catch (error) {
        console.error("Failed to fetch AI status:", error);
      }
    }

    fetchAiStatus();
  }, []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/projects");
        const data = await response.json();
        if (data.ok && data.projects) {
          setProjects(data.projects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const displayProjects = projects.length > 0 ? projects : projectCards;

  return (
    <main className="home-page">
      <section className="hero-card hero-card--landing">
        <div className="hero-card__top">
          <span className="eyebrow">跨学科 EI 论文工作台</span>
          <span className="hero-plaque">移动优先重构版</span>
        </div>
        <h1>先选，再看，再确认。把论文流程顺成一条线。</h1>
        <p>
          这里不再让你同时面对太多区域。无论是新建项目、选题目类型、拆框架还是逐章写作，都会先给当前结论，再展开可操作的输入和选择。
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span>开始方式</span>
            <strong>先定主题与投稿规则</strong>
          </div>
          <div className="hero-stat">
            <span>中段推进</span>
            <strong>按方案和章节逐步确认</strong>
          </div>
          <div className="hero-stat">
            <span>最终输出</span>
            <strong>先看全文，再决定定稿</strong>
          </div>
        </div>
        <div className="button-row">
          <Link className="primary-button" href="/projects/new">
            从主题开始
          </Link>
          <Link className="secondary-button" href="/projects/atelier-zero?venue=ieee-iccci-2026">
            看完整示例流程
          </Link>
        </div>
      </section>

      <section className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">快速入口</span>
            <h3>先做一件最明确的事</h3>
          </div>
          <div className="stack-list">
            <Link className="line-item line-item--link" href="/projects/new">
              <strong>新建论文项目</strong>
              <span>从主题、对象和关键词开始，先把第一步定下来。</span>
            </Link>
            <Link
              className="line-item line-item--link"
              href="/projects/atelier-zero?venue=ieee-iccci-2026"
            >
              <strong>继续示例项目</strong>
              <span>直接进入完整 5 步流程，查看移动版页面组织方式。</span>
            </Link>
          </div>
        </section>

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">系统状态</span>
            <h3>当前可用能力</h3>
          </div>
          <div className="capability-list">
            <div className="capability-item">
              <span>写作模型</span>
              <strong>{ai.model}</strong>
            </div>
            <div className="capability-item">
              <span>联网能力</span>
              <strong>{ai.canUseWebSearch ? "模型侧已开启" : "未开启"}</strong>
            </div>
            <div className="capability-item">
              <span>当前状态</span>
              <strong>{ai.hasApiKey ? "本地可试用" : "等待配置密钥"}</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="content-card">
        <div className="grid-header">
          <div>
            <span className="eyebrow">当前项目</span>
            <h2>继续上次停下来的项目</h2>
          </div>
          <p>每个项目都沿同一条 5 步主流程推进，打开就知道现在该做什么、下一步去哪。</p>
        </div>
        <div className="project-grid top-gap">
          {loading ? (
            <div className="project-card">
              <p>加载项目中...</p>
            </div>
          ) : (
            displayProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </section>

      <section className="capability-board">
        <article className="capability-board__card">
          <span className="eyebrow">步骤 1</span>
          <h3>先把方向和边界定准</h3>
          <p>先确定研究对象、关键词和会议规则，后面每一步才不会越走越偏。</p>
        </article>
        <article className="capability-board__card">
          <span className="eyebrow">步骤 2</span>
          <h3>先选方案，再做微调</h3>
          <p>方向页和框架页都优先给你可选方案，而不是把用户扔进空白输入框。</p>
        </article>
        <article className="capability-board__card">
          <span className="eyebrow">步骤 3</span>
          <h3>逐章确认，最后再定稿</h3>
          <p>每一章都能自检和存档，全文页只负责整合、检查和明确留下最终版本。</p>
        </article>
      </section>
    </main>
  );
}
