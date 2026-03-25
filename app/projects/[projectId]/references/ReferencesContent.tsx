"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProjectNav } from "@/components/project-nav";
import { ReferenceManagerPanel } from "@/components/reference-manager";
import { buildVenueHref } from "@/lib/venue-profiles";

type ReferencesContentProps = {
  projectId: string;
};

export default function ReferencesContent({ projectId }: ReferencesContentProps) {
  const [activeTab, setActiveTab] = useState<"references" | "materials">("references");

  return (
    <>
      <ProjectNav projectId={projectId} />
      
      <main className="project-main">
        <section className="hero-card hero-card--compact">
          <div className="page-intro page-intro--stack">
            <div>
              <span className="eyebrow">第 6 步 / 共 6 步</span>
              <h1>参考文献与图文材料</h1>
              <p>管理论文的参考文献和相关图文材料，确保引用准确且内容完整。</p>
            </div>
            <Link className="secondary-button" href={buildVenueHref(`/projects/${projectId}`, undefined)}>
              返回项目概览
            </Link>
          </div>
        </section>

        {/* Tab 切换 */}
        <div className="tab-navigation">
          <button
            className={activeTab === "references" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("references")}
          >
            参考文献管理
          </button>
          <button
            className={activeTab === "materials" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("materials")}
          >
            图文材料
          </button>
        </div>

        {activeTab === "references" && (
          <>
            <ReferenceManagerPanel projectId={projectId} />

            <section className="content-card">
              <div className="card-heading card-heading--stack">
                <span className="eyebrow">引用格式</span>
                <h3>选择参考文献引用格式</h3>
              </div>
              <div className="stack-list">
                <div className="line-item">
                  <strong>IEEE 格式</strong>
                  <button className="secondary-button">使用此格式</button>
                </div>
                <div className="line-item">
                  <strong>APA 格式</strong>
                  <button className="secondary-button">使用此格式</button>
                </div>
                <div className="line-item">
                  <strong>MLA 格式</strong>
                  <button className="secondary-button">使用此格式</button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "materials" && (
          <section className="content-card">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">图文材料</span>
              <h3>管理论文相关的图片和图表</h3>
            </div>
            <div className="stack-list">
              <div className="line-item line-item--column">
                <strong>上传图文材料</strong>
                <p>支持上传图片、图表、表格等材料，用于论文中的插图和数据展示。</p>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx" />
              </div>
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .tab-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          padding: 0 4px;
        }

        .tab-button {
          padding: 12px 24px;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .tab-button.active {
          background: #3b82f6;
          color: white;
        }
      `}</style>
    </>
  );
}
