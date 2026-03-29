"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { projectCards } from "@/lib/demo-data";
import {
  getPaperTypeById,
  paperTypeProfiles,
  type PaperCategory
} from "@/lib/paper-type-profiles";
import type { ProjectCardItem } from "@/lib/demo-data";

type Project = ProjectCardItem;

const workflowSteps = [
  { key: "discover", label: "探索", subtitle: "Discovery" },
  { key: "define", label: "题型", subtitle: "Type" },
  { key: "structure", label: "布局", subtitle: "Structure" },
  { key: "draft", label: "写作", subtitle: "Drafting" },
  { key: "review", label: "审阅", subtitle: "Review" },
  { key: "finalize", label: "定稿", subtitle: "Finalize" }
];

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAiStatus() {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setAi({
          provider: data.provider,
          model: data.model,
          hasApiKey: data.hasApiKey,
          webSearchEnabled: data.webSearchEnabled,
          canGeneratePaperDraft: data.canGeneratePaperDraft,
          canUseWebSearch: data.canUseWebSearch
        });
      } catch (error) {
        console.error("Failed to fetch AI status:", error);
      }
    }

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

    void fetchAiStatus();
    void fetchProjects();
  }, []);

  const displayProjects = projects.length > 0 ? projects : projectCards;
  const latestProject = displayProjects[0];
  const selectedProfile = useMemo(() => getPaperTypeById(selectedPaperType), [selectedPaperType]);

  return (
    <main className="atelier-home">
      <section className="atelier-home__hero">
        <div className="atelier-home__intro">
          <div className="atelier-kicker-row">
            <span className="atelier-kicker">首页入口</span>
            <span className="atelier-mark">当前项目与下一步</span>
          </div>
          <h1>先看当前项目，再决定下一步</h1>
          <p>
            这里不放复杂功能，只保留最近项目、当前阶段和新建入口。先判断，再进入具体工作台。
          </p>
        </div>

        <aside className="atelier-home__focus">
          <div className="atelier-focus-card">
            <span className="atelier-kicker">继续当前工作</span>
            <strong>{latestProject?.title ?? "示例项目"}</strong>
            <p>{latestProject?.subtitle ?? "打开项目后继续章节写作与质量检查。"}</p>
            <Link className="atelier-button atelier-button--ghost" href={buildProjectHref(latestProject?.id, latestProject?.venueId)}>
              继续上次项目
            </Link>
          </div>
          <div className="atelier-status-card">
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
        </aside>
      </section>

      <section className="atelier-home__strip">
        {workflowSteps.map((step, index) => (
          <article key={step.key} className="atelier-strip-step">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
            <small>{step.subtitle}</small>
          </article>
        ))}
      </section>

      <section className="atelier-home__body">
        <div className="atelier-home__main">
          <section className="atelier-panel atelier-panel--projects">
            <div className="atelier-panel__head">
              <div>
                <span className="atelier-kicker">继续最近的工作</span>
                <h2>当前项目</h2>
              </div>
              <Link className="atelier-text-link" href="/projects/new">
                新建研究项目
              </Link>
            </div>
            <div className="atelier-project-list">
              {loading ? (
                <div className="atelier-project-row atelier-project-row--loading">加载项目中...</div>
              ) : (
                displayProjects.map((project) => {
                  const progressLabel =
                    project.stage === "已确定主题方向"
                      ? "下一步：进入题型与方案"
                      : project.stage === "已拆论文框架"
                        ? "下一步：进入逐章写作"
                        : project.stage === "分章节写作中"
                          ? "下一步：继续处理当前章节"
                          : "下一步：检查全文并导出";

                  return (
                    <Link
                      key={project.id}
                      className="atelier-project-row"
                      href={buildProjectHref(project.id, project.venueId)}
                    >
                      <div className="atelier-project-row__main">
                        <div className="atelier-project-row__meta">
                          <span>{project.stage}</span>
                          <span>{project.updatedAt}</span>
                        </div>
                        <strong>{project.title}</strong>
                        <p>{project.subtitle}</p>
                      </div>
                      <div className="atelier-project-row__side">
                        <span>{project.conference}</span>
                        <strong>{progressLabel}</strong>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="atelier-home__rail">
          <section className="atelier-panel atelier-panel--settings">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">研究设置</span>
              <h2>先确认题型，再进入框架</h2>
              <p>首页只保留当前题型的关键约束，详细流程进入项目后再展开。</p>
            </div>

            <div className="atelier-type-grid">
              {paperTypeProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={profile.id === selectedPaperType ? "atelier-type-chip active" : "atelier-type-chip"}
                  onClick={() => setSelectedPaperType(profile.id)}
                  type="button"
                >
                  <span>{profile.shortName}</span>
                  <small>{profile.category}</small>
                </button>
              ))}
            </div>

            <div className="atelier-type-summary">
              <div className="atelier-type-summary__card">
                <span>摘要</span>
                <strong>{selectedProfile.requirements.abstract.split("，")[0]}</strong>
              </div>
              <div className="atelier-type-summary__card">
                <span>篇幅</span>
                <strong>{selectedProfile.requirements.length.split("，")[0]}</strong>
              </div>
              <div className="atelier-type-summary__card atelier-type-summary__card--wide">
                <span>结构</span>
                <strong>{selectedProfile.requirements.structure.split("，")[0]}</strong>
              </div>
              <div className="atelier-type-summary__card atelier-type-summary__card--wide">
                <span>写作取向</span>
                <strong>{selectedProfile.writingStyle.tone.split("，")[0]}</strong>
              </div>
            </div>

            <Link className="atelier-button" href={`/projects/new?paperType=${selectedPaperType}`}>
              开始创作{selectedProfile.shortName}
            </Link>
          </section>

          <section className="atelier-panel atelier-panel--principles">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">操作原则</span>
              <h2>首页负责入口和判断</h2>
            </div>
            <ul className="atelier-bullets">
              <li>先看当前阶段，再决定下一步，不让用户一上来面对一堆功能。</li>
              <li>写作、文献、审阅、定稿各自独立，不混在同一张后台页面里。</li>
              <li>真正的深度处理放到项目工作台里，不在首页堆满说明卡。</li>
            </ul>
          </section>
        </aside>
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
