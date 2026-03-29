"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { buildVenueHref } from "@/lib/venue-profiles";

type NavItem = {
  href: string;
  label: string;
  subtitle: string;
  index: string;
};

const generalItems: NavItem[] = [
  { href: "/", label: "项目首页", subtitle: "Home", index: "01" },
  { href: "/projects/new", label: "新建项目", subtitle: "Create", index: "02" },
  {
    href: "/projects/atelier-zero?venue=ieee-iccci-2026",
    label: "示例项目",
    subtitle: "Demo",
    index: "03"
  },
  {
    href: "/projects/atelier-zero/references?venue=ieee-iccci-2026",
    label: "文献中心",
    subtitle: "Library",
    index: "04"
  }
];

const projectItems = (projectId: string, venueId: string | null): NavItem[] => [
  {
    href: buildVenueHref(`/projects/${projectId}`, venueId),
    label: "项目总览",
    subtitle: "Overview",
    index: "01"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/profile`, venueId),
    label: "研究方向",
    subtitle: "Discovery",
    index: "02"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/outline`, venueId),
    label: "论文框架",
    subtitle: "Structure",
    index: "03"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/writing`, venueId),
    label: "章节写作",
    subtitle: "Drafting",
    index: "04"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/references`, venueId),
    label: "文献证据",
    subtitle: "Citation",
    index: "05"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/export`, venueId),
    label: "全文定稿",
    subtitle: "Finalize",
    index: "06"
  }
];

export function StitchShellNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");
  const projectId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const items = projectId ? projectItems(projectId, venueId) : generalItems;

  return (
    <aside className="atelier-sidebar">
      <div className="atelier-sidebar__brand">
        <Link className="atelier-sidebar__logo" href="/">
          Atelier EI
        </Link>
        <p>AI 学术编辑工作台</p>
      </div>

      <div className="atelier-sidebar__section">
        <span className="atelier-sidebar__eyebrow">当前视图</span>
        <strong>{projectId ? "项目流程" : "总览入口"}</strong>
      </div>

      <nav className="atelier-sidebar__nav" aria-label="全局导航">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href.split("?")[0]);

          return (
            <Link
              key={item.href}
              className={active ? "atelier-sidebar__item active" : "atelier-sidebar__item"}
              href={item.href}
            >
              <span className="atelier-sidebar__index">{item.index}</span>
              <span className="atelier-sidebar__copy">
                <span className="atelier-sidebar__label">{item.label}</span>
                <span className="atelier-sidebar__subtitle">{item.subtitle}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="atelier-sidebar__footer">
        <Link className="atelier-sidebar__cta" href="/projects/new">
          新建研究项目
        </Link>
      </div>
    </aside>
  );
}
