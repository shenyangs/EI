import type { Metadata } from "next";
import { Suspense } from "react";

import { ConnectionLightsServer } from "@/components/connection-lights-server";
import { StitchShellNav } from "@/components/stitch-shell-nav";
import { AuthNav } from "@/components/auth-nav";
import SimpleDevTools from "@/components/dev/SimpleDevTools";
import { ToastProvider } from "@/components/ui/toast";
import { fallbackStyles } from "@/lib/fallback-styles";
import { getPublicSystemRuntime } from "@/lib/server/admin-governance";
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
  const systemRuntime = getPublicSystemRuntime();

  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          <style id="fallback-styles">{fallbackStyles}</style>
          <div className="atelier-shell">
            <Suspense fallback={null}>
              <StitchShellNav />
            </Suspense>
            <div className="atelier-shell__stage">
              <header className="atelier-topbar">
                <div className="atelier-topbar__search">搜索项目代号、会议或章节...</div>
                <div className="atelier-topbar__panel">
                  <ConnectionLightsServer />
                  <AuthNav allowRegistration={systemRuntime.allowRegistration} />
                </div>
              </header>
              <div className="atelier-shell__content">{children}</div>
            </div>
          </div>
          <SimpleDevTools />
        </ToastProvider>
      </body>
    </html>
  );
}
