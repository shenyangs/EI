import type { Metadata } from "next";
import Link from "next/link";

import { ConnectionLights } from "@/components/connection-lights";
import { AuthNav } from "@/components/auth-nav";
import SimpleDevTools from "@/components/dev/SimpleDevTools";
import { fallbackStyles } from "@/lib/fallback-styles";
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
              <Link className="brand" href="/">
                Atelier EI
              </Link>
              <p className="brand-subtitle">跨学科时尚与设计 EI 论文工作台</p>
            </div>
            <div className="site-header__panel">
              <AuthNav />
              <ConnectionLights
                initialModelConnected={false}
                initialWebSearchConnected={false}
              />
            </div>
          </header>
          {children}
        </div>
        
        {/* 一键超管工具 */}
        <SimpleDevTools />
      </body>
    </html>
  );
}
