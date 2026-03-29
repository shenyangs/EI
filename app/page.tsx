"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PaperTypeSelector } from "@/components/paper-type-selector";
import { ProjectCard } from "@/components/project-card";
import { projectCards } from "@/lib/demo-data";
import type { PaperCategory } from "@/lib/paper-type-profiles";

import type { ProjectCardItem } from "@/lib/demo-data";

type Project = ProjectCardItem;

export default function HomePage() {
  const [selectedPaperType, setSelectedPaperType] = useState<PaperCategory>("ei-conference");
  const [ai, setAi] = useState({
    provider: "google" as const,
    model: "gemini-pro",
    hasApiKey: false,
    webSearchEnabled: true,
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
            hasApiKey: data.hasApiKey,
            webSearchEnabled: data.webSearchEnabled,
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
  const latestProject = displayProjects[0];

  return (
    <main className="home-page home-page--stitch">
      <section className="stitch-command-home">
        <div className="stitch-command-home__main">
          <div className="hero-card__top">
            <span className="eyebrow">Research Operating System</span>
            <span className="hero-plaque">Atelier EI</span>
          </div>
          <h1>把选题、结构、章节写作、证据管理和定稿放进同一张研究指挥台。</h1>
          <p>
            这不是普通论文工具页，而是一套研究推进系统。首页负责告诉你从哪里开始，项目页负责判断下一步，写作页负责把单章真正写稳。
          </p>
          <div className="stitch-command-home__actions">
            <Link className="primary-button" href="/projects/new">
              新建研究项目
            </Link>
            <Link className="secondary-button" href="/projects/atelier-zero?venue=ieee-iccci-2026">
              进入示例项目
            </Link>
          </div>
          <div className="stitch-command-home__signals">
            <article>
              <span>当前推荐入口</span>
              <strong>从研究主题开始</strong>
            </article>
            <article>
              <span>核心工作流</span>
              <strong>选题 → 路径 → 框架 → 写作 → 文献 → 定稿</strong>
            </article>
            <article>
              <span>最终目标</span>
              <strong>产出更稳的 EI 论文终稿</strong>
            </article>
          </div>
        </div>

        <aside className="stitch-command-home__rail">
          <section className="stitch-brief-card">
            <span className="eyebrow">继续当前工作</span>
            <strong>{latestProject?.title ?? "示例项目"}</strong>
            <p>{latestProject?.subtitle ?? "打开项目后，先看当前阶段，再决定继续写哪一章。"}</p>
            <Link
              className="secondary-button"
              href={buildProjectHref(latestProject?.id, latestProject?.venueId)}
            >
              继续上次项目
            </Link>
          </section>

          <section className="stitch-brief-card stitch-brief-card--muted">
            <span className="eyebrow">当前系统状态</span>
            <div className="stitch-status-list">
              <div>
                <span>模型</span>
                <strong>{ai.model}</strong>
              </div>
              <div>
                <span>联网检索</span>
                <strong>{ai.canUseWebSearch ? "已开启" : "未开启"}</strong>
              </div>
              <div>
                <span>写作草稿</span>
                <strong>{ai.canGeneratePaperDraft ? "可生成" : "准备中"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="stitch-home-grid">
        <section className="content-card stitch-panel stitch-panel--flow">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">研究主线</span>
            <h2>整套产品围绕 6 步推进，而不是把所有功能堆成目录。</h2>
            <p>每一步都只负责一个主要产出，减少用户在错误阶段做太多决策的概率。</p>
          </div>
          <div className="stitch-flow-board">
            <article className="stitch-flow-step">
              <span>01</span>
              <strong>定研究主题</strong>
              <p>先把对象、场景、关键词和目标会议定清楚。</p>
            </article>
            <article className="stitch-flow-step">
              <span>02</span>
              <strong>选研究路径</strong>
              <p>从多个题型或方案里选一条最适合继续写的路线。</p>
            </article>
            <article className="stitch-flow-step">
              <span>03</span>
              <strong>锁论文框架</strong>
              <p>先把章节骨架和每章目标固定，再进入正文写作。</p>
            </article>
            <article className="stitch-flow-step">
              <span>04</span>
              <strong>逐章写作</strong>
              <p>单章生成、修改、检查、补证据，不把任务混在一起。</p>
            </article>
            <article className="stitch-flow-step">
              <span>05</span>
              <strong>整理文献证据</strong>
              <p>把引用、出处、备注和材料准备好，不把证据工作留到最后。</p>
            </article>
            <article className="stitch-flow-step">
              <span>06</span>
              <strong>全文定稿</strong>
              <p>最后统一检查结构、格式、引用和导出结果。</p>
            </article>
          </div>
        </section>

        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">论文类型</span>
            <h3>先告诉系统你在写哪一类论文</h3>
            <p>题型定清楚后，结构建议、格式约束和写作顺序才会跟着变化。</p>
          </div>
          <PaperTypeSelector
            onTypeChange={setSelectedPaperType}
            initialType={selectedPaperType}
          />
        </section>

        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">工作原则</span>
            <h3>为什么首页要这样组织</h3>
          </div>
          <ul className="bullet-list">
            <li>先看当前阶段和下一步，不让用户一上来面对一堆按钮。</li>
            <li>把“生成、检查、归档”拆开，保证每一步结果都能确认。</li>
            <li>首页负责进入，项目页负责判断，写作页负责深度处理。</li>
          </ul>
        </section>
      </section>

      <section className="content-card stitch-projects-panel">
        <div className="grid-header">
          <div>
            <span className="eyebrow">当前项目</span>
            <h2>继续你已经推进中的研究项目</h2>
          </div>
          <p>打开项目后先看到当前阶段、风险、材料缺口和下一步入口，而不是回到一个普通项目列表。</p>
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
    </main>
  );
}

function buildProjectHref(projectId?: string, venueId?: string) {
  if (!projectId) {
    return "/projects/atelier-zero?venue=ieee-iccci-2026";
  }

  return venueId ? `/projects/${projectId}?venue=${venueId}` : `/projects/${projectId}`;
}
