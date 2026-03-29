import type { Metadata } from "next";
import { Suspense } from "react";

import { ConnectionLights } from "@/components/connection-lights";
import { StitchShellNav } from "@/components/stitch-shell-nav";
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
        <div className="site-frame">
          <Suspense fallback={null}>
            <StitchShellNav />
          </Suspense>
          <div className="site-stage">
            <header className="site-topbar">
              <div className="site-topbar__search">
                <span>搜索项目代号、会议或章节...</span>
              </div>
              <div className="site-topbar__panel">
                <ConnectionLights
                  initialModelConnected={false}
                  initialWebSearchConnected={false}
                />
                <AuthNav />
              </div>
            </header>
            <div className="site-shell">{children}</div>
          </div>
        </div>
        
        {/* 一键超管工具 */}
        <SimpleDevTools />
      </body>
    </html>
  );
}
