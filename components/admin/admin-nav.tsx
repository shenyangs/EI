"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  {
    href: "/admin",
    label: "总览仪表台",
    note: "先看系统状态与待补模块"
  },
  {
    href: "/admin/data-governance",
    label: "数据治理",
    note: "归档、恢复和项目体量管理"
  },
  {
    href: "/admin/risk-alerts",
    label: "风险告警",
    note: "把系统风险和优先级收成告警卡"
  },
  {
    href: "/admin/capacity",
    label: "成本与容量",
    note: "看系统负载、体量和模型压力"
  },
  {
    href: "/admin/users",
    label: "用户与权限",
    note: "管理账号、角色和权限摘要"
  },
  {
    href: "/admin/access",
    label: "角色与用户组",
    note: "管理角色组、自定义权限方案"
  },
  {
    href: "/admin/diagnostics",
    label: "运行诊断",
    note: "检查 AI、联网和关键接口"
  },
  {
    href: "/admin/audit",
    label: "审计日志",
    note: "追踪权限、系统与安全变更"
  },
  {
    href: "/admin/system",
    label: "系统配置",
    note: "管理注册策略与全局开关"
  },
  {
    href: "/admin/ai-models",
    label: "AI 模型",
    note: "维护模型、默认项与连通测试"
  },
  {
    href: "/admin/ai-module-configs",
    label: "模型切换",
    note: "逐块决定 AI 功能跟系统预置还是指定模型"
  }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="atelier-admin-nav" aria-label="超级管理员导航">
      {adminLinks.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "atelier-admin-nav__item active" : "atelier-admin-nav__item"}
          >
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </Link>
        );
      })}
      <article className="atelier-admin-nav__item atelier-admin-nav__item--planned">
        <strong>下一批继续</strong>
        <span>资源级授权、自动备份回滚、真实账单费用对接</span>
      </article>
    </nav>
  );
}
