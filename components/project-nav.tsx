"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { buildVenueHref } from "@/lib/venue-profiles";

type ProjectNavProps = {
  projectId: string;
};

const items = [
  { href: "", label: "主题与方向" },
  { href: "/profile", label: "题目类型" },
  { href: "/outline", label: "论文框架" },
  { href: "/writing", label: "逐章写作" },
  { href: "/export", label: "全文预览" }
];

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");

  return (
    <nav className="project-nav" aria-label="项目导航">
      {items.map((item) => {
        const baseHref = `/projects/${projectId}${item.href}`;
        const href = buildVenueHref(baseHref, venueId);
        const isActive = pathname === baseHref;

        return (
          <Link
            key={item.label}
            className={isActive ? "project-nav__item active" : "project-nav__item"}
            href={href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
