import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { VenueProfileSummary } from "@/components/venue-profile-summary";
import { getProjectById } from "@/lib/demo-data";
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
  const project = getProjectById(projectId);
  const venueProfile = getVenueProfileById(venue);

  if (!project) {
    notFound();
  }

  return (
    <div className="workbench-stack">
      <section className="content-card content-card--accent">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">当前总览</span>
          <h3>先看清现在在哪一步，再决定下一步做什么。</h3>
        </div>
        <p className="lead-text">
          这个项目已经绑定了目标会议和研究方向。移动版首页把“下一步”和“当前风险”拆开显示，避免你一进来就被过多细节打断。
        </p>
        <div className="metric-grid">
          <div className="metric-card">
            <span>目标会议</span>
            <strong>{venueProfile.shortName}</strong>
          </div>
          <div className="metric-card">
            <span>研究类型</span>
            <strong>{project.discipline}</strong>
          </div>
          <div className="metric-card">
            <span>当前阶段</span>
            <strong>{project.stage}</strong>
          </div>
        </div>
        <div className="button-row top-gap">
          <Link className="secondary-button" href={buildVenueHref(`/projects/${project.id}/profile`, venue)}>
            先看题目类型方案
          </Link>
          <Link className="primary-button" href={buildVenueHref(`/projects/${project.id}/outline`, venue)}>
            继续到论文框架
          </Link>
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">主流程</span>
          <h3>现在该沿这 5 步往前走</h3>
        </div>
        <div className="outline-list">
          {project.flowSteps.map((step, index) => (
            <Link
              key={step.label}
              href={buildVenueHref(step.href, venue)}
              className="outline-item outline-item--link"
            >
              <div className="outline-item__index">0{index + 1}</div>
              <div className="outline-item__body">
                <div className="outline-item__head">
                  <strong>{step.label}</strong>
                  <StatusBadge tone={step.done ? "sage" : "amber"}>
                    {step.done ? "已完成" : "下一步"}
                  </StatusBadge>
                </div>
                <p>{step.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <VenueProfileSummary venue={venueProfile} />

      <div className="project-page-grid">
        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">推荐方法</span>
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

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">待补材料</span>
            <h3>系统建议先补齐这些内容</h3>
          </div>
          <ul className="bullet-list">
            {project.materialsNeeded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="content-card">
        <div className="card-heading">
          <span className="eyebrow">高风险提醒</span>
          <h3>这些问题会影响后面的写作质量和导出检查。</h3>
        </div>
        <div className="risk-list">
          {project.risks.map((risk) => (
            <div key={risk} className="risk-item">
              {risk}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
