import Link from "next/link";

import { ProjectCard } from "@/components/project-card";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import { projectCards } from "@/lib/demo-data";

export default function HomePage() {
  const ai = getAiCapabilitySnapshot();

  return (
    <main className="landing-layout">
      <aside className="left-rail">
        <div className="rail-block">
          <p className="rail-label">导航</p>
          <div className="rail-links">
            <Link href="/">项目首页</Link>
            <Link href="/projects/new">新建项目</Link>
          </div>
        </div>
        <div className="rail-block rail-block--highlight">
          <p className="rail-label">模型能力</p>
          <div className="capability-list">
            <div className="capability-item">
              <span>写作模型</span>
              <strong>{ai.model}</strong>
            </div>
            <div className="capability-item">
              <span>联网能力</span>
              <strong>
                {ai.canUseWebSearch ? "模型侧已开启" : "未开启"}
              </strong>
            </div>
            <div className="capability-item">
              <span>当前状态</span>
              <strong>{ai.hasApiKey ? "本地可试用" : "等待配置密钥"}</strong>
            </div>
          </div>
        </div>
        <div className="rail-block">
          <p className="rail-label">系统提醒</p>
          <ul className="bullet-list">
            <li>1 个项目缺少样本来源说明</li>
            <li>1 个项目还未绑定模板文件</li>
            <li>2 个项目适合先完善论文提纲</li>
          </ul>
        </div>
      </aside>

      <section className="hero-panel">
        <div className="hero-card">
          <div className="hero-card__top">
            <span className="eyebrow">跨学科 EI 论文工作台</span>
            <span className="hero-plaque">按 5 步推进</span>
          </div>
          <h1>从题目方向开始，一步步写成完整 EI 论文。</h1>
          <p>
            先定研究方向，再选题目类型、论文框架和章节草稿，最后预览全文。每一步都会先给你可继续的内容，不让你对着空白页发呆。
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span>第 1 步</span>
              <strong>先定题目方向</strong>
            </div>
            <div className="hero-stat">
              <span>第 2-3 步</span>
              <strong>选题型并确认框架</strong>
            </div>
            <div className="hero-stat">
              <span>第 4-5 步</span>
              <strong>逐章确认再看全文</strong>
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
        </div>

        <div className="grid-header">
          <div>
            <span className="eyebrow">当前项目</span>
            <h2>继续上次停下来的项目</h2>
          </div>
          <p>每个项目都沿同一条 5 步主流程推进，打开就知道下一步该做什么。</p>
        </div>

        <div className="project-grid">
          {projectCards.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        <div className="capability-board">
          <article className="capability-board__card">
            <span className="eyebrow">步骤一</span>
            <h3>先把研究方向定准</h3>
            <p>先判断你的题目更偏设计实践、用户研究、技术应用还是交叉研究，再决定该怎么写。</p>
          </article>
          <article className="capability-board__card">
            <span className="eyebrow">步骤二</span>
            <h3>先拆框架，不直接写整篇</h3>
            <p>先把标题、摘要方向、章节顺序和每章目标拆清楚，再进入正文写作，这样不容易写偏。</p>
          </article>
          <article className="capability-board__card">
            <span className="eyebrow">步骤三</span>
            <h3>按章节确认，再输出全文</h3>
            <p>每一章都可以单独生成、修改、确认，最后把确认过的内容汇总成全文，再做检查和导出。</p>
          </article>
        </div>
      </section>
    </main>
  );
}
