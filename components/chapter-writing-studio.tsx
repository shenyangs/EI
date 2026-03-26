"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { streamAiTask, StreamingAiProcessor } from "@/lib/streaming-ai";

import { ProjectNav } from "@/components/project-nav";
import { VenueRuleSelector } from "@/components/venue-rule-selector";
import { buildVenueHref, VenueProfile } from "@/lib/venue-profiles";

type DraftResponse = {
  ok: boolean;
  content?: string;
  error?: string;
};

async function requestDraft(prompt: string) {
  const response = await fetch("/api/ai/draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  return (await response.json()) as DraftResponse;
}

type Chapter = {
  id: string;
  title: string;
  status: string;
  goal: string;
  summary: string;
};

type AiAnalysis = {
  content: string;
  quality: {
    overallScore: number;
    approved: boolean;
    criteria: Array<{
      name: string;
      score: number;
      feedback: string;
    }>;
    suggestions: string[];
  };
  metadata: {
    wordCount: number;
    estimatedReadingTime: number;
    topics: string[];
  };
  revisionSuggestions?: Array<{
    section: string;
    issue: string;
    suggestion: string;
    severity: string;
  }>;
};

type ChapterWritingStudioProps = {
  projectId: string;
  projectTitle: string;
  venueProfile: VenueProfile;
  chapters: Chapter[];
  initialChapterId: string | undefined;
  venueId: string | undefined;
};

export function ChapterWritingStudio({
  projectId,
  projectTitle,
  venueProfile,
  chapters,
  initialChapterId,
  venueId
}: ChapterWritingStudioProps) {
  const [activeChapterId, setActiveChapterId] = useState(initialChapterId || chapters[0]?.id || "");
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResult, setStreamingResult] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, AiAnalysis>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    suggestions: string[];
    rating: number;
  } | null>(null);
  const [draftMap, setDraftMap] = useState<Record<string, string[]>>({});
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingProcessor, setStreamingProcessor] = useState<StreamingAiProcessor | null>(null);

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId);
  const activeParagraphs = draftMap[activeChapterId] || [];

  // 检查章节内容是否为空
  const isChapterEmpty = useMemo(() => {
    return activeParagraphs.length === 0 || activeParagraphs.every((p) => !p.trim());
  }, [activeParagraphs]);

  // 生成章节内容
  async function generateChapterContent() {
    if (!activeChapter) return;

    startTransition(async () => {
      setIsGenerating(true);
      setMessage(`正在生成"${activeChapter.title}"章节内容...`);

      try {
        const result = await requestDraft(
          `请为论文《${projectTitle}》的"${activeChapter.title}"章节生成详细内容。

章节目标：${activeChapter.goal}
章节摘要：${activeChapter.summary}

要求：
1. 内容要符合 ${venueProfile.name} 的论文要求
2. 语气像 ${venueProfile.name} 对应的会议论文，不要空泛
3. 内容要具体、有深度，体现学术性
4. 不要编造参考文献
5. 章节长度要符合要求（${venueProfile.lengthGuidance.chapterChars[0]}-${venueProfile.lengthGuidance.chapterChars[1]} 字）`
        );

        if (!result.ok || !result.content) {
          setMessage(result.error ?? "生成失败，请稍后再试。");
          return;
        }

        const paragraphs = result.content
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        setDraftMap((current) => ({
          ...current,
          [activeChapter.id]: paragraphs
        }));

        setMessage(`"${activeChapter.title}"章节内容已生成，正在自动自检。`);
        await runChapterCheck(
          activeChapter.id,
          paragraphs,
          activeChapter.goal,
          activeChapter.title
        );
      } catch (error) {
        setMessage("生成失败，请稍后再试。");
      } finally {
        setIsGenerating(false);
      }
    });
  }

  // 重新生成当前章节
  async function regenerateCurrentChapter() {
    if (!activeChapter) return;

    startTransition(async () => {
      setIsGenerating(true);
      setMessage(`正在重新生成"${activeChapter.title}"章节内容...`);

      try {
        const result = await requestDraft(
          `请重新生成论文《${projectTitle}》的"${activeChapter.title}"章节内容。

章节目标：${activeChapter.goal}
章节摘要：${activeChapter.summary}

要求：
1. 内容要符合 ${venueProfile.name} 的论文要求
2. 语气像 ${venueProfile.name} 对应的会议论文，不要空泛
3. 内容要具体、有深度，体现学术性
4. 不要编造参考文献
5. 章节长度要符合要求（${venueProfile.lengthGuidance.chapterChars[0]}-${venueProfile.lengthGuidance.chapterChars[1]} 字）
6. 提供与之前不同的角度和内容`
        );

        if (!result.ok || !result.content) {
          setMessage(result.error ?? "重新生成失败，请稍后再试。");
          return;
        }

        const paragraphs = result.content
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        setDraftMap((current) => ({
          ...current,
          [activeChapter.id]: paragraphs
        }));

        setMessage(`"${activeChapter.title}"章节内容已重新生成，正在自动自检。`);
        await runChapterCheck(
          activeChapter.id,
          paragraphs,
          activeChapter.goal,
          activeChapter.title
        );
      } catch (error) {
        setMessage("重新生成失败，请稍后再试。");
      } finally {
        setIsGenerating(false);
      }
    });
  }

  // 应用自定义修改指令
  async function applyCustomInstruction() {
    if (!customInstruction.trim()) {
      setMessage("先写一句你的修改要求，再让 AI 按这个方向改。");
      return;
    }

    startTransition(async () => {
      setMessage(`正在按你的要求修改"${activeChapter?.title}"...`);

      try {
        const result = await requestDraft(
          `请按照以下要求修改论文《${projectTitle}》的"${activeChapter?.title}"章节：
${customInstruction}

当前章节内容：
${activeParagraphs.join("\n\n")}

要求：
1. 保留章节目标：${activeChapter?.goal}
2. 结合当前章节摘要：${activeChapter?.summary}
3. 语气像 ${venueProfile.name} 对应的会议论文，不要空泛
4. 不编造参考文献
5. 只输出修改后的正文内容`
        );

        if (!result.ok || !result.content) {
          setMessage(result.error ?? "修改失败，请稍后再试。");
          return;
        }

        const nextParagraphs = result.content
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        setDraftMap((current) => ({
          ...current,
          [activeChapterId]: nextParagraphs.length > 0 ? nextParagraphs : [result.content!]
        }));
        setMessage(`"${activeChapter?.title}"已经按你的要求修改完成，正在自动自检。`);
        await runChapterCheck(
          activeChapterId,
          nextParagraphs.length > 0 ? nextParagraphs : [result.content!],
          activeChapter?.goal || "",
          activeChapter?.title || ""
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "按要求修改失败。";
        setMessage(message);
      }
    });
  }

  // 章节检查
  async function runChapterCheck(
    chapterId: string,
    paragraphs: string[],
    chapterGoal: string,
    chapterTitle: string
  ) {
    if (!activeChapter) return;

    setIsChecking(true);
    setMessage(`正在检查"${chapterTitle}"章节质量...`);

    try {
      const content = paragraphs.join("\n\n");

      const result = await requestDraft(
        `请对论文《${projectTitle}》的"${chapterTitle}"章节进行质量评估。

章节内容：
${content}

章节目标：${chapterGoal}

要求：
1. 评估内容是否符合 ${venueProfile.name} 的论文要求
2. 评估内容的学术性、逻辑性和完整性
3. 给出整体评分（0-100）
4. 提供具体的改进建议
5. 分析内容是否达到章节目标
6. 不要编造参考文献
7. 输出格式：
   - 整体评分
   - 评估标准和得分
   - 改进建议
   - 是否通过评估`
      );

      if (!result.ok || !result.content) {
        setMessage("检查失败，请稍后再试。");
        return;
      }

      // 解析评估结果
      const analysis = parseQualityAnalysis(result.content, content);

      setAiAnalysisMap((current) => ({
        ...current,
        [chapterId]: analysis
      }));

      setMessage(
        analysis.quality.approved
          ? `"${chapterTitle}"章节质量检查通过！`
          : `"${chapterTitle}"章节需要改进，请查看具体建议。`
      );
      setShowAiAnalysis(true);
    } catch (error) {
      setMessage("检查失败，请稍后再试。");
    } finally {
      setIsChecking(false);
    }
  }

  // 解析质量评估结果
  function parseQualityAnalysis(content: string, originalContent: string): AiAnalysis {
    // 提取评分
    const scoreMatch = content.match(/整体评分：?(\d+)/i);
    const overallScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;

    // 提取是否通过
    const approved = content.toLowerCase().includes("通过") || overallScore >= 70;

    // 提取改进建议
    const suggestionsMatch = content.match(/改进建议[：:]([\s\S]*?)(?:是否通过评估|$)/i);
    const suggestions = suggestionsMatch
      ? suggestionsMatch[1].split(/[\n\r]+/).filter((s) => s.trim())
      : ["建议进一步完善内容的学术性", "建议加强逻辑结构"];

    // 计算字数和阅读时间
    const wordCount = originalContent.length;
    const estimatedReadingTime = Math.ceil(wordCount / 500); // 假设每分钟阅读500字

    // 提取主题关键词
    const topics = extractTopics(originalContent);

    return {
      content: originalContent,
      quality: {
        overallScore,
        approved,
        criteria: [
          {
            name: "学术性",
            score: Math.floor(overallScore * 0.4),
            feedback: "内容的学术深度和专业程度"
          },
          {
            name: "逻辑性",
            score: Math.floor(overallScore * 0.3),
            feedback: "内容的逻辑结构和论证过程"
          },
          {
            name: "完整性",
            score: Math.floor(overallScore * 0.3),
            feedback: "内容的全面性和细节丰富度"
          }
        ],
        suggestions
      },
      metadata: {
        wordCount,
        estimatedReadingTime,
        topics
      }
    };
  }

  // 提取主题关键词
  function extractTopics(content: string): string[] {
    const stopWords = new Set([
      "的", "了", "和", "与", "或", "但", "是", "在", "有", "为", "以", "我们", "这", "那", "并", "而", "就", "因为", "所以", "如果", "虽然", "然而", "此外", "另外", "同时", "因此", "总之"
    ]);

    // 简单的关键词提取逻辑
    const words = content
      .replace(/[.,?!;:"'()\[\]{}]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // 统计词频
    const wordFreq = new Map<string, number>();
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // 排序并取前5个
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  return (
    <>
      <ProjectNav projectId={projectId} />

      <main className="project-main">
        <section className="hero-card hero-card--compact">
          <div className="page-intro page-intro--stack">
            <div>
              <span className="eyebrow">第四步</span>
              <h1>章节写作工作室</h1>
              <p>为每个章节生成和完善内容，确保符合学术标准和会议要求。</p>
            </div>
            <Link
              className="secondary-button"
              href={buildVenueHref(`/projects/${projectId}/outline`, venueProfile.id)}
            >
              返回大纲
            </Link>
          </div>
        </section>

        {/* 章节选择器 */}
        <section className="content-card">
          <div className="card-heading">
            <h2>章节管理</h2>
          </div>
          <div className="chapter-selector">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                className={`chapter-button ${chapter.id === activeChapterId ? "active" : ""}`}
                onClick={() => setActiveChapterId(chapter.id)}
              >
                <span className="chapter-title">{chapter.title}</span>
                <span className="chapter-status">{chapter.status}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 章节编辑器 */}
        <section className="content-card">
          <div className="card-heading">
            <h2>{activeChapter?.title || "章节内容"}</h2>
            <p>{activeChapter?.goal || ""}</p>
          </div>

          {isChapterEmpty ? (
            <div className="empty-chapter">
              <p>章节内容为空，点击下方按钮生成内容。</p>
              <button
                className="primary-button"
                onClick={generateChapterContent}
                disabled={isGenerating}
              >
                {isGenerating ? "生成中..." : "AI 生成章节内容"}
              </button>
            </div>
          ) : (
            <div className="chapter-editor">
              {/* 段落编辑器 */}
              <div className="paragraphs">
                {activeParagraphs.map((paragraph, index) => (
                  <div key={index} className="paragraph">
                    <textarea
                      value={paragraph}
                      onChange={(e) => {
                        const newParagraphs = [...activeParagraphs];
                        newParagraphs[index] = e.target.value;
                        setDraftMap((current) => ({
                          ...current,
                          [activeChapterId]: newParagraphs
                        }));
                      }}
                      placeholder="输入段落内容..."
                    />
                    <div className="paragraph-actions">
                      <button
                        className="small-button"
                        onClick={() => {
                          const newParagraphs = [...activeParagraphs];
                          newParagraphs.splice(index + 1, 0, "");
                          setDraftMap((current) => ({
                            ...current,
                            [activeChapterId]: newParagraphs
                          }));
                          setActiveParagraphIndex(index + 1);
                        }}
                      >
                        在下方插入
                      </button>
                      {activeParagraphs.length > 1 && (
                        <button
                          className="small-button delete-button"
                          onClick={() => {
                            const newParagraphs = [...activeParagraphs];
                            newParagraphs.splice(index, 1);
                            setDraftMap((current) => ({
                              ...current,
                              [activeChapterId]: newParagraphs
                            }));
                            setActiveParagraphIndex(Math.max(0, index - 1));
                          }}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="editor-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    const newParagraphs = [...activeParagraphs, ""];
                    setDraftMap((current) => ({
                      ...current,
                      [activeChapterId]: newParagraphs
                    }));
                    setActiveParagraphIndex(newParagraphs.length - 1);
                  }}
                >
                  添加段落
                </button>
                <button
                  className="secondary-button"
                  onClick={regenerateCurrentChapter}
                  disabled={isGenerating}
                >
                  {isGenerating ? "重新生成中..." : "重新生成章节"}
                </button>
                <button
                  className="primary-button"
                  onClick={() => runChapterCheck(
                    activeChapterId,
                    activeParagraphs,
                    activeChapter?.goal || "",
                    activeChapter?.title || ""
                  )}
                  disabled={isChecking}
                >
                  {isChecking ? "检查中..." : "检查章节质量"}
                </button>
              </div>

              {/* 自定义修改指令 */}
              <div className="custom-instruction">
                <label htmlFor="custom-instruction">自定义修改要求</label>
                <textarea
                  id="custom-instruction"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="例如：增加实证案例，强化理论分析，调整结构..."
                  rows={3}
                />
                <button
                  className="secondary-button"
                  onClick={applyCustomInstruction}
                  disabled={!customInstruction.trim()}
                >
                  按要求修改
                </button>
              </div>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className="message">
              <p>{message}</p>
            </div>
          )}

          {/* AI 分析结果 */}
          {showAiAnalysis && aiAnalysisMap[activeChapterId] && (
            <div className="ai-analysis">
              <div className="ai-analysis-header">
                <h3>AI 分析结果</h3>
                <button
                  className="small-button"
                  onClick={() => setShowAiAnalysis(false)}
                >
                  关闭
                </button>
              </div>
              <div className="stack-list">
                <div className="line-item line-item--column">
                  <strong>质量评估</strong>
                  <div style={{ 
                    backgroundColor: aiAnalysisMap[activeChapterId].quality.approved ? '#e8f5e8' : '#ffebee', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>整体评分：</strong>{aiAnalysisMap[activeChapterId].quality.overallScore}/100
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '16px', 
                        backgroundColor: aiAnalysisMap[activeChapterId].quality.approved ? '#4caf50' : '#f44336', 
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        {aiAnalysisMap[activeChapterId].quality.approved ? '通过' : '需改进'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="quality-criteria">
                    {aiAnalysisMap[activeChapterId].quality.criteria.map((criterion, index) => (
                      <div key={index} className="criterion">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{criterion.name}</span>
                          <span>{criterion.score}/100</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${(criterion.score / 100) * 100}%`,
                              backgroundColor: criterion.score >= 70 ? '#4caf50' : criterion.score >= 40 ? '#ff9800' : '#f44336'
                            }}
                          />
                        </div>
                        <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{criterion.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="line-item line-item--column">
                  <strong>改进建议</strong>
                  <ul className="suggestions-list">
                    {aiAnalysisMap[activeChapterId].quality.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="line-item line-item--column">
                  <strong>章节统计</strong>
                  <div className="chapter-stats">
                    <span>字数：{aiAnalysisMap[activeChapterId].metadata.wordCount}</span>
                    <span>阅读时间：{aiAnalysisMap[activeChapterId].metadata.estimatedReadingTime}分钟</span>
                    <span>主题：{aiAnalysisMap[activeChapterId].metadata.topics.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .chapter-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chapter-button {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chapter-button:hover {
          border-color: #3b82f6;
        }

        .chapter-button.active {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .chapter-title {
          font-weight: 500;
        }

        .chapter-status {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          background: #f3f4f6;
          color: #6b7280;
        }

        .empty-chapter {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-chapter p {
          margin-bottom: 20px;
          color: #6b7280;
        }

        .chapter-editor {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .paragraphs {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .paragraph {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .paragraph textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          resize: vertical;
          min-height: 100px;
        }

        .paragraph-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .small-button {
          padding: 4px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .small-button:hover {
          background: #f3f4f6;
        }

        .small-button.delete-button {
          color: #ef4444;
          border-color: #fecaca;
        }

        .small-button.delete-button:hover {
          background: #fef2f2;
        }

        .editor-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .custom-instruction {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .custom-instruction textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          resize: vertical;
        }

        .message {
          margin-top: 16px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 8px;
          color: #374151;
        }

        .ai-analysis {
          margin-top: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .ai-analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .ai-analysis-header h3 {
          margin: 0;
        }

        .quality-criteria {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        .criterion {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .suggestions-list {
          list-style: disc;
          padding-left: 20px;
          margin: 8px 0 0 0;
        }

        .suggestions-list li {
          margin-bottom: 8px;
        }

        .chapter-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 8px;
          font-size: 14px;
          color: #6b7280;
        }
      `}</style>
    </>
  );
}
