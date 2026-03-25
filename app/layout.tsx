import type { Metadata } from "next";
import Link from "next/link";

import { ConnectionLights } from "@/components/connection-lights";
import { fallbackStyles } from "@/lib/fallback-styles";
import { getAiCapabilitySnapshot } from "@/lib/ai-runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: "跨学科时尚与设计 EI 论文工作台",
  description: "面向服装服饰设计、艺术、时尚与交叉学科的 EI 论文生成工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <style id="fallback-styles">{fallbackStyles}</style>
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header__copy">
              <span className="eyebrow">移动优先工作台</span>
              <Link className="brand" href="/">
                Atelier EI
              </Link>
              <p className="brand-subtitle">跨学科时尚与设计 EI 论文工作台</p>
            </div>
            <div className="site-header__panel">
              <ConnectionLights
                initialModelConnected={false}
                initialWebSearchConnected={false}
              />
              <div className="site-header__tools">
                <Link className="ghost-chip" href="/projects/new">
                  新建论文项目
                </Link>
                <Link
                  className="ghost-chip ghost-chip--accent"
                  href="/projects/atelier-zero?venue=ieee-iccci-2026"
                >
                  查看 5 步示例
                </Link>
                <span className="ghost-chip">自动保存已开启</span>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
