import Link from "next/link";

const liveModules = [
  {
    title: "用户与权限",
    note: "查看账号、切换角色、理解谁能做什么",
    href: "/admin/users"
  },
  {
    title: "运行诊断",
    note: "确认 AI、联网、接口与数据状态是否正常",
    href: "/admin/diagnostics"
  },
  {
    title: "角色与用户组",
    note: "梳理系统角色、用户组和自定义权限方案",
    href: "/admin/access"
  },
  {
    title: "审计日志",
    note: "查看权限、系统与安全相关的后台操作记录",
    href: "/admin/audit"
  },
  {
    title: "系统配置",
    note: "承接注册策略、默认题型和功能开关",
    href: "/admin/system"
  },
  {
    title: "AI 模型",
    note: "管理可用模型、默认模型和连通性",
    href: "/admin/ai-models"
  },
  {
    title: "模型切换",
    note: "把每个 AI 功能拆开，决定跟系统预置还是指定模型",
    href: "/admin/ai-module-configs"
  }
];

const plannedModules = [
  "数据治理与项目恢复",
  "风险告警",
  "真正可执行的自定义角色授权",
  "成本与容量统计"
];

export default function AdminOverviewPage() {
  return (
    <div className="atelier-admin-overview">
      <section className="atelier-admin-grid atelier-admin-grid--notes">
        {liveModules.map((module) => (
          <article key={module.href} className="content-card atelier-admin-overview-card">
            <span className="atelier-kicker">已可进入</span>
            <h2>{module.title}</h2>
            <p>{module.note}</p>
            <Link className="atelier-button atelier-button--ghost" href={module.href}>
              打开这个模块
            </Link>
          </article>
        ))}
      </section>

      <section className="atelier-admin-grid atelier-admin-grid--notes">
        <section className="content-card atelier-admin-guide-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">这轮已经补上</span>
            <h2>为什么现在先做这两块</h2>
          </div>
          <ul className="atelier-bullets">
            <li>用户与权限，决定超级管理员是否真的能管理“人”。</li>
            <li>运行诊断，决定管理员能否第一时间看懂“系统为什么不正常”。</li>
            <li>这两块补齐后，后续再接用户组、审计和系统配置会顺得多。</li>
          </ul>
        </section>

        <section className="content-card atelier-admin-guide-card">
          <div className="atelier-panel__head atelier-panel__head--stack">
            <span className="atelier-kicker">下一批规划</span>
            <h2>不能再缺的后台能力</h2>
          </div>
          <div className="atelier-admin-chip-list">
            {plannedModules.map((module) => (
              <span key={module} className="atelier-admin-badge atelier-admin-badge--quiet">
                {module}
              </span>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
