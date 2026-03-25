import Link from "next/link";

import { VenueRuleSelector } from "@/components/venue-rule-selector";

export default function NewProjectPage() {
  return (
    <main className="single-panel-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">第 1 步 / 共 5 步</span>
          <h1>新建论文项目</h1>
          <p>第一步先定主题和方向。等这一步明确了，系统才会继续帮你拆框架、分章节和输出全文。</p>
        </div>
        <Link className="secondary-button" href="/">
          返回项目首页
        </Link>
      </div>

      <div className="wizard-layout">
        <aside className="wizard-steps">
          <div className="wizard-step active">1 定主题和方向</div>
          <div className="wizard-step">2 判断题目类型</div>
          <div className="wizard-step">3 拆论文框架</div>
          <div className="wizard-step">4 分章节写作</div>
          <div className="wizard-step">5 输出全文</div>
        </aside>

        <section className="form-card">
          <div className="card-heading">
            <span className="eyebrow">研究主题</span>
            <h2>先告诉系统你想研究什么</h2>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>论文主题</span>
              <input defaultValue="非遗纹样驱动的智能服饰交互设计研究" />
              <small>这是你的研究核心问题，系统会据此判断论文类型。</small>
            </label>

            <label className="field">
              <span>研究对象</span>
              <input defaultValue="智能服饰原型、传统纹样元素、试穿用户" />
              <small>比如服装产品、品牌案例、用户群体、文化符号等。</small>
            </label>

            <label className="field field--full">
              <span>关键词</span>
              <input defaultValue="非遗纹样, 智能服饰, 用户体验, 交互设计" />
              <small>可以先随便填，后面提纲页还能继续调整。</small>
            </label>

            <label className="field field--full">
              <span>已有想法说明</span>
              <textarea
                defaultValue="我想研究传统纹样如何进入智能服饰场景，并通过小规模用户测试验证文化识别度和交互体验。"
                rows={6}
              />
              <small>这里写你现在最真实的想法，不需要一开始就很学术。</small>
            </label>
          </div>

          <div className="helper-banner">
            <div>
              <strong>不知道怎么分类也没关系。</strong>
              <p>你可以先点下面这个按钮，让系统先帮你判断题目更适合哪种论文路线。</p>
            </div>
            <Link className="secondary-button" href="/projects/atelier-zero/profile?venue=ieee-iccci-2026">
              系统帮我判断题目类型
            </Link>
          </div>

          <VenueRuleSelector initialVenueId="ieee-iccci-2026" projectHref="/projects/atelier-zero" />
        </section>
      </div>
    </main>
  );
}
