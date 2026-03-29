"use client";

import { useSearchParams } from "next/navigation";

import { getVenueProfileById } from "@/lib/venue-profiles";

export function VenueHeaderInfo() {
  const searchParams = useSearchParams();
  const venue = getVenueProfileById(searchParams.get("venue"));

  return (
    <>
      <span className="eyebrow">{venue.shortName}</span>
      <h2>按当前会议规则继续推进全文。</h2>
      <p className="project-hero__copy">
        当前已绑定 {venue.name} 规则。后面的框架、自检、字数判断和导出检查，都会沿这套投稿画像继续推进。
      </p>
    </>
  );
}
