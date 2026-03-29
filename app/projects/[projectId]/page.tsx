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
    <div className="atelier-overview">
      <section className="atelier-overview__hero">
        <div className="atelier-overview__copy">
          <span className="atelier-kicker">Project Decision Cockpit</span>
          <h2>先判断项目到了哪一步，再决定下一步做什么。</h2>
          <p>
            这页负责回答三件事：当前阶段是否正确、最值得推进的动作是什么、还有哪些风险必须先消掉。
          </p>
        </div>

        <aside className="atelier-overview__action">
          <span className="atelier-kicker">当前建议</span>
          <strong>{project.stage === "分章节写作中" ? "继续当前章节写作" : "优先锁定论文框架"}</strong>
          <p>
            {project.stage === "分章节写作中"
              ? "先把单章写稳、补齐证据与自检，再进入全文整合。"
              : "先把结构骨架确认清楚，再进入正文写作，返工会少很多。"}
          </p>
          <div className="atelier-action-row">
            <Link className="atelier-button atelier-button--ghost" href={buildVenueHref(`/projects/${project.id}/profile`, venue)}>
              查看题型方案
            </Link>
            <Link
              className="atelier-button"
              href={buildVenueHref(
                project.stage === "分章节写作中" ? `/projects/${project.id}/writing` : `/projects/${project.id}/outline`,
                venue
              )}
            >
              {project.stage === "分章节写作中" ? "进入写作台" : "继续到框架"}
            </Link>
          </div>
        </aside>
      </section>

      <section className="atelier-overview__grid">
        <section className="atelier-panel">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">当前主线</span>
            <h2>按这条工作流继续推进</h2>
          </div>
          <div className="atelier-overview-flow">
            {project.flowSteps.map((step, index) => (
              <Link
                key={step.label}
                className="atelier-overview-flow__item"
                href={buildVenueHref(step.href, venue)}
              >
                <div className="atelier-overview-flow__index">{String(index + 1).padStart(2, "0")}</div>
                <div className="atelier-overview-flow__body">
                  <div className="atelier-overview-flow__head">
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

        <div className="atelier-overview__side">
          <section className="atelier-panel">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">待补材料</span>
              <h2>当前缺口</h2>
            </div>
            <ul className="atelier-bullets">
              {project.materialsNeeded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="atelier-panel atelier-panel--warn">
            <div className="atelier-panel__head atelier-panel__head--stack">
              <span className="atelier-kicker">高风险提醒</span>
              <h2>这些问题要先消掉</h2>
            </div>
            <div className="atelier-risk-list">
              {project.risks.map((risk) => (
                <div key={risk} className="atelier-risk-item">
                  {risk}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="atelier-overview__support">
        <section className="atelier-panel">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">建议方法</span>
            <h2>当前推荐的方法组合</h2>
          </div>
          <div className="atelier-method-list">
            {project.methodology.map((item) => (
              <div key={item} className="atelier-method-list__item">
                <span>{item}</span>
                <StatusBadge>{item.length > 6 ? "重点" : "基础"}</StatusBadge>
              </div>
            ))}
          </div>
        </section>

        <VenueProfileSummary venue={venueProfile} />
      </section>
    </div>
  );
}
