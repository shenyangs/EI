"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { buildVenueHref } from "@/lib/venue-profiles";

type NavItem = {
  href: string;
  label: string;
  subtitle: string;
};

const generalItems: NavItem[] = [
  { href: "/", label: "当页项目", subtitle: "Home" },
  { href: "/projects/new", label: "工作台", subtitle: "Studio" },
  {
    href: "/projects/atelier-zero?venue=ieee-iccci-2026",
    label: "示例项目",
    subtitle: "Demo"
  },
  {
    href: "/projects/atelier-zero/references?venue=ieee-iccci-2026",
    label: "文献中心",
    subtitle: "Library"
  }
];

const projectItems = (projectId: string, venueId: string | null): NavItem[] => [
  {
    href: buildVenueHref(`/projects/${projectId}`, venueId),
    label: "当页项目",
    subtitle: "Overview"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/profile`, venueId),
    label: "选题路径",
    subtitle: "Discovery"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/outline`, venueId),
    label: "论文框架",
    subtitle: "Structure"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/writing`, venueId),
    label: "章节写作",
    subtitle: "Drafting"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/references`, venueId),
    label: "文献证据",
    subtitle: "Citation"
  },
  {
    href: buildVenueHref(`/projects/${projectId}/export`, venueId),
    label: "全文定稿",
    subtitle: "Finalize"
  }
];

export function StitchShellNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");
  const projectId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const items = projectId ? projectItems(projectId, venueId) : generalItems;

  return (
    <aside className="stitch-shell-nav">
      <div className="stitch-shell-nav__brand">
        <Link className="stitch-shell-nav__logo" href="/">
          Atelier EI
        </Link>
        <p>学术编辑工作台</p>
      </div>

      <div className="stitch-shell-nav__meta">
        <span>当前视图</span>
        <strong>{projectId ? "项目流程" : "总览入口"}</strong>
      </div>

      <nav className="stitch-shell-nav__list" aria-label="全局导航">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href.split("?")[0]);

          return (
            <Link
              key={item.href}
              className={active ? "stitch-shell-nav__item active" : "stitch-shell-nav__item"}
              href={item.href}
            >
              <span className="stitch-shell-nav__item-label">{item.label}</span>
              <span className="stitch-shell-nav__item-subtitle">{item.subtitle}</span>
            </Link>
          );
        })}
      </nav>

      <div className="stitch-shell-nav__footer">
        <Link className="stitch-shell-nav__cta" href="/projects/new">
          新建研究项目
        </Link>
      </div>
    </aside>
  );
}
