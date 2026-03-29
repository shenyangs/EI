import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { VenueProfileSummary } from "@/components/venue-profile-summary";
import { getProjectViewById } from "@/lib/project-view";
import { buildVenueHref, getVenueProfileById } from "@/lib/venue-profiles";

export default async function ProjectOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ venue?: string }>;
}) {
  const { projectId } = await params;
  const { venue } = await searchParams;
  const project = await getProjectViewById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack overview-page overview-page--stitch">
      <section className="overview-cockpit">
        <div className="overview-cockpit__main">
          <span className="eyebrow">Project Decision Cockpit</span>
          <h2 className="stitch-title-stack stitch-title-stack--tight">
            <span>先判断项目到了哪一步，</span>
            <span>再决定下一步做什么。</span>
          </h2>
          <p>
            这页不是信息汇总页，而是你的项目决策台。它负责回答三件事：当前阶段、下一步动作、还有哪些风险必须先消掉。
          </p>
          <div className="overview-cockpit__metrics">
            <article className="overview-cockpit__metric">
              <span>目标会议</span>
              <strong>{venueProfile.shortName}</strong>
            </article>
            <article className="overview-cockpit__metric">
              <span>研究类型</span>
              <strong>{project.discipline}</strong>
            </article>
            <article className="overview-cockpit__metric">
              <span>当前阶段</span>
              <strong>{project.stage}</strong>
            </article>
          </div>
        </div>

        <aside className="overview-cockpit__rail">
          <section className="overview-priority-card">
            <span className="eyebrow">系统建议</span>
            <strong>{project.stage === "分章节写作中" ? "继续当前章节写作" : "优先锁定论文框架"}</strong>
            <p>
              {project.stage === "分章节写作中"
                ? "当前最值得推进的是把单章写稳、补齐证据和质量检查，再考虑进入全文整合。"
                : "先把结构骨架确认清楚，再进入逐章写作，后面的返工会少很多。"}
            </p>
            <div className="button-row top-gap">
              <Link className="secondary-button" href={buildVenueHref(`/projects/${project.id}/profile`, venue)}>
                查看题型方案
              </Link>
              <Link
                className="primary-button"
                href={buildVenueHref(
                  project.stage === "分章节写作中" ? `/projects/${project.id}/writing` : `/projects/${project.id}/outline`,
                  venue
                )}
              >
                {project.stage === "分章节写作中" ? "进入写作工作台" : "继续到论文框架"}
              </Link>
            </div>
          </section>
        </aside>
      </section>

      <section className="overview-decision-grid">
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">当前主线</span>
            <h3>接下来应该沿哪条工作流继续推进</h3>
          </div>
          <div className="overview-flow-list">
            {project.flowSteps.map((step, index) => (
              <Link
                key={step.label}
                href={buildVenueHref(step.href, venue)}
                className="overview-flow-item overview-flow-item--stitch"
              >
                <div className="overview-flow-item__index">0{index + 1}</div>
                <div className="overview-flow-item__body">
                  <div className="overview-flow-item__head">
                    <strong>{step.label}</strong>
                    <StatusBadge tone={step.done ? "sage" : "amber"}>
                      {step.done ? "已完成" : "继续处理"}
                    </StatusBadge>
                  </div>
                  <p>{step.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="overview-side-stack">
          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">待补材料</span>
              <h3>当前缺口</h3>
            </div>
            <ul className="bullet-list">
              {project.materialsNeeded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="content-card content-card--risk stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">高风险提醒</span>
              <h3>这些问题需要优先消掉</h3>
            </div>
            <div className="risk-list">
              {project.risks.map((risk) => (
                <div key={risk} className="risk-item">
                  {risk}
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>

      <div className="project-page-grid overview-support-grid">
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">建议方法</span>
            <h3>当前建议的方法组合</h3>
          </div>
          <div className="stack-list">
            {project.methodology.map((item) => (
              <div key={item} className="line-item">
                <span>{item}</span>
                <StatusBadge>{item.length > 6 ? "重点" : "基础"}</StatusBadge>
              </div>
            ))}
          </div>
        </section>

        <VenueProfileSummary venue={venueProfile} />
      </div>
    </div>
  );
}
