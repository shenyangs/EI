"use client";

import Link from "next/link";
import { useState } from "react";

import { ReferenceManagerPanel } from "@/components/reference-manager";
import { buildVenueHref } from "@/lib/venue-profiles";

type ReferencesContentProps = {
  projectId: string;
};

export default function ReferencesContent({ projectId }: ReferencesContentProps) {
  const [activeTab, setActiveTab] = useState<"references" | "materials">("references");

  return (
    <div className="workbench-stack">
      <section className="content-card stitch-panel">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">当前处理重点</span>
          <h3>先决定你现在是在补引用，还是在补图文材料</h3>
        </div>
        <div className="stitch-tab-navigation">
          <button
            className={activeTab === "references" ? "stitch-tab-button active" : "stitch-tab-button"}
            onClick={() => setActiveTab("references")}
            type="button"
          >
            参考文献管理
          </button>
          <button
            className={activeTab === "materials" ? "stitch-tab-button active" : "stitch-tab-button"}
            onClick={() => setActiveTab("materials")}
            type="button"
          >
            图文材料
          </button>
        </div>
      </section>

      {activeTab === "references" ? (
        <>
          <ReferenceManagerPanel projectId={projectId} />

          <section className="content-card stitch-panel">
            <div className="card-heading card-heading--stack">
              <span className="eyebrow">引用格式</span>
              <h3>选择当前项目采用的引用格式</h3>
            </div>
            <div className="stack-list">
              <div className="line-item">
                <strong>IEEE 格式</strong>
                <button className="secondary-button" type="button">使用此格式</button>
              </div>
              <div className="line-item">
                <strong>APA 格式</strong>
                <button className="secondary-button" type="button">使用此格式</button>
              </div>
              <div className="line-item">
                <strong>MLA 格式</strong>
                <button className="secondary-button" type="button">使用此格式</button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="content-card stitch-panel">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">图文材料</span>
            <h3>管理论文相关的图片、图表和附加材料</h3>
          </div>
          <div className="stack-list">
            <div className="line-item line-item--column">
              <strong>上传图文材料</strong>
              <p>支持上传图片、图表、表格等材料，用于论文中的插图、实验结果展示和证据补强。</p>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx" />
            </div>
          </div>
          <div className="button-row top-gap">
            <Link className="secondary-button" href={buildVenueHref(`/projects/${projectId}/writing`, undefined)}>
              返回写作工作台
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
