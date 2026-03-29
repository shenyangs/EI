import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="atelier-admin-shell">
      <section className="atelier-admin-shell__hero">
        <div className="atelier-admin-shell__main">
          <div className="atelier-kicker-row">
            <span className="atelier-kicker">超级管理员后台</span>
            <span className="atelier-mark">系统控制、权限与运行诊断</span>
          </div>
          <h1>这里不只是管 AI，还负责整套系统的秩序</h1>
          <p>
            这一层现在开始承担真正的后台职责：用户与角色、AI 与联网、运行诊断，以及后续要补齐的审计、系统配置和数据治理。
          </p>
        </div>
        <div className="atelier-admin-shell__side">
          <div className="content-card atelier-admin-shell__card">
            <span className="atelier-kicker">当前范围</span>
            <strong>先交付用户、权限与诊断</strong>
            <p>这样超级管理员不再只是 AI 设置页，而是能真正控制系统。</p>
          </div>
          <div className="atelier-admin-actions">
            <Link className="atelier-button atelier-button--ghost" href="/">
              返回主站
            </Link>
          </div>
        </div>
      </section>

      <AdminNav />

      <section className="atelier-admin-shell__content">{children}</section>
    </main>
  );
}
