"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";

import { buildVenueHref } from "@/lib/venue-profiles";

type ProjectNavProps = {
  projectId: string;
  variant?: "default" | "dock";
};

const items = [
  { href: "", label: "主题与方向", shortLabel: "主题" },
  { href: "/profile", label: "题目类型", shortLabel: "题型" },
  { href: "/outline", label: "论文框架", shortLabel: "框架" },
  { href: "/writing", label: "逐章写作", shortLabel: "写作" },
  { href: "/export", label: "全文预览", shortLabel: "全文" },
  { href: "/references", label: "参考文献", shortLabel: "文献" }
];

export function ProjectNav({ projectId, variant = "default" }: ProjectNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");
  const isDock = variant === "dock";
  const navStyle = {
    "--project-nav-columns": items.length
  } as CSSProperties;

  return (
    <nav
      className={isDock ? "project-nav project-nav--dock" : "project-nav"}
      aria-label="项目导航"
      style={navStyle}
    >
      {items.map((item) => {
        const baseHref = `/projects/${projectId}${item.href}`;
        const href = buildVenueHref(baseHref, venueId);
        const isActive = pathname === baseHref;
        const index = items.indexOf(item) + 1;

        return (
          <Link
            key={item.label}
            className={
              isDock
                ? isActive
                  ? "project-nav__dock-item active"
                  : "project-nav__dock-item"
                : isActive
                  ? "project-nav__item active"
                  : "project-nav__item"
            }
            href={href}
            aria-current={isActive ? "page" : undefined}
          >
            {isDock ? (
              <>
                <span className="project-nav__dock-icon">0{index}</span>
                <span className="project-nav__dock-label">{item.shortLabel}</span>
              </>
            ) : (
              <>
                <span className="project-nav__index">0{index}</span>
                <span className="project-nav__label">{item.label}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
