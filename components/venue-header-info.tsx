"use client";

import { useSearchParams } from "next/navigation";

import { getVenueProfileById } from "@/lib/venue-profiles";

export function VenueHeaderInfo() {
  const searchParams = useSearchParams();
  const venue = getVenueProfileById(searchParams.get("venue"));

  return (
    <>
      <span className="eyebrow">{venue.shortName}</span>
      <h2>先定方向，再逐步写完整篇论文。</h2>
      <p className="project-hero__copy">
        当前已绑定 {venue.name} 规则。后面的框架、自检、字数判断和导出检查，都会继续按这套会议画像推进。
      </p>
    </>
  );
}
