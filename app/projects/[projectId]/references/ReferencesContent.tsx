"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProjectNav } from "@/components/project-nav";
import { buildVenueHref } from "@/lib/venue-profiles";

type AcademicPaper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number | null;
  source: string;
  url: string;
  venue: string | null;
  citations: number | null;
  matchedQueries: string[];
};

type ReferencesContentProps = {
  projectId: string;
};

export default function ReferencesContent({ projectId }: ReferencesContentProps) {
  const [papers, setPapers] = useState<AcademicPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // 模拟数据，实际应该从API获取
  const mockPapers: AcademicPaper[] = [
    {
      id: "1",
      title: "智能服饰中的传统纹样设计与应用",
      abstract: "本文探讨了传统纹样在智能服饰设计中的应用，通过分析传统纹样的文化内涵和现代智能服饰的技术特点，提出了一种融合传统与现代的设计方法。",
      authors: ["张三", "李四", "王五"],
      year: 2025,
      source: "IEEE",
      url: "https://example.com/paper1",
      venue: "IEEE ICCCI 2026",
      citations: 15,
      matchedQueries: ["智能服饰", "传统纹样"]
    },
    {
      id: "2",
      title: "基于用户体验的智能服饰交互设计研究",
      abstract: "本研究通过用户测试和数据分析，探讨了智能服饰的交互设计原则，提出了一套以用户为中心的交互设计框架。",
      authors: ["赵六", "孙七"],
      year: 2024,
      source: "ACM",
      url: "https://example.com/paper2",
      venue: "ACM CHI 2024",
      citations: 23,
      matchedQueries: ["智能服饰", "用户体验"]
    },
    {
      id: "3",
      title: "非遗纹样的数字化保护与创新应用",
      abstract: "本文介绍了非遗纹样的数字化保护方法，并探讨了其在现代设计中的创新应用，为非遗文化的传承与发展提供了新的思路。",
      authors: ["周八", "吴九", "郑十"],
      year: 2023,
      source: "Springer",
      url: "https://example.com/paper3",
      venue: "Springer Design Studies",
      citations: 31,
      matchedQueries: ["非遗纹样", "数字化保护"]
    }
  ];

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setPapers(mockPapers);
      setLoading(false);
    }, 500);
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // 实际应该调用搜索API
      // const response = await fetch(`/api/academic/search?query=${encodeURIComponent(searchQuery)}`);
      // const data = await response.json();
      // if (data.ok) {
      //   setPapers(data.papers);
      // }
      
      // 模拟搜索结果
      const filteredPapers = mockPapers.filter(paper => 
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setPapers(filteredPapers);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }

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

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">文献搜索</span>
            <h3>查找相关学术文献</h3>
          </div>
          <div className="form-grid">
            <div className="field field--full">
              <span>搜索关键词</span>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入关键词搜索文献"
              />
            </div>
            <div className="field field--full">
              <button 
                className="primary-button" 
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? "搜索中..." : "搜索文献"}
              </button>
            </div>
          </div>
        </section>

        <section className="content-card">
          <div className="card-heading card-heading--stack">
            <span className="eyebrow">文献列表</span>
            <h3>已添加的参考文献</h3>
          </div>
          {loading ? (
            <p>加载中...</p>
          ) : papers.length === 0 ? (
            <p>暂无参考文献，请使用搜索功能添加。</p>
          ) : (
            <div className="stack-list">
              {papers.map((paper) => (
                <div key={paper.id} className="line-item line-item--column">
                  <div className="line-item__head">
                    <strong>{paper.title}</strong>
                    <span>{paper.year}</span>
                  </div>
                  <p>{paper.abstract}</p>
                  <div className="line-item__head">
                    <span>{paper.authors.join(", ")}</span>
                    <span>{paper.venue}</span>
                  </div>
                  <div className="line-item__head">
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      查看原文
                    </a>
                    <span>{paper.citations ? `${paper.citations} 次引用` : "无引用数据"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
      </main>
    </>
  );
}