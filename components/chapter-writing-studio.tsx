"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { VenueRuleSelector } from "@/components/venue-rule-selector";
import type {
  AssetItem,
  ChapterDraft,
  CheckItem,
  ReferenceItem
} from "@/lib/demo-data";
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
  chapters: ChapterDraft[];
  references: ReferenceItem[];
  assets: AssetItem[];
  checks: CheckItem[];
  initialChapterId: string | undefined;
  venueId: string | undefined;
};

export function ChapterWritingStudio({
  projectId,
  projectTitle,
  venueProfile,
  chapters,
  references,
  assets,
  checks,
  initialChapterId,
  venueId
}: ChapterWritingStudioProps) {
  const [activeChapterId, setActiveChapterId] = useState(initialChapterId || chapters[0]?.id || "");
  const [, setActiveParagraphIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, AiAnalysis>>({});
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftMap, setDraftMap] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter.paragraphs]))
  );
  
  const [, startTransition] = useTransition();

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId);
  const activeParagraphs = useMemo(() => draftMap[activeChapterId] ?? [], [draftMap, activeChapterId]);

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
    <section className="writing-studio-layout">
      <aside className="content-card stitch-panel writing-studio-sidebar">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">章节导航</span>
          <h2>当前写作章节</h2>
          <p>一次只处理一个章节，减少在多个章节之间来回跳转的负担。</p>
        </div>
        <div className="chapter-selector">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              className={`chapter-button ${chapter.id === activeChapterId ? "active" : ""}`}
              onClick={() => setActiveChapterId(chapter.id)}
              type="button"
            >
              <span className="chapter-title">{chapter.title}</span>
              <span className="chapter-status">{chapter.status}</span>
            </button>
          ))}
        </div>

        <div className="hint-panel top-gap">
          <strong>当前章节目标</strong>
          <p>{activeChapter?.goal || "先从左侧选择一个章节。"}</p>
        </div>
        <div className="hint-panel">
          <strong>当前章节摘要</strong>
          <p>{activeChapter?.summary || "选中章节后，这里会显示本章摘要。"}</p>
        </div>
        <div className="hint-panel">
          <strong>AI 当前可帮你做的事</strong>
          <ul className="bullet-list">
            {(activeChapter?.aiOptions ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="content-card stitch-panel writing-studio-main">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">正文工作区</span>
          <h2>{activeChapter?.title || "章节内容"}</h2>
          <p>{activeChapter?.goal || "先选择章节，再开始写作或修改。"}</p>
        </div>

        <div className="writing-toolbar">
          <Link
            className="secondary-button"
            href={buildVenueHref(`/projects/${projectId}/outline`, venueId)}
          >
            返回论文框架
          </Link>
          <Link
            className="secondary-button"
            href={buildVenueHref(`/projects/${projectId}/export`, venueId)}
          >
            查看全文页
          </Link>
        </div>

        {isChapterEmpty ? (
          <div className="empty-chapter">
            <p>当前章节还没有正文，先让系统生成一个可修改的初稿，再继续人工调整。</p>
            <button
              className="primary-button"
              onClick={generateChapterContent}
              disabled={isGenerating}
              type="button"
            >
              {isGenerating ? "生成中..." : "AI 生成章节内容"}
            </button>
          </div>
        ) : (
          <div className="chapter-editor">
            <div className="paragraphs">
              {activeParagraphs.map((paragraph, index) => (
                <div key={`${activeChapterId}-${index}`} className="paragraph">
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
                      type="button"
                    >
                      在下方插入
                    </button>
                    {activeParagraphs.length > 1 ? (
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
                        type="button"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

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
                type="button"
              >
                添加段落
              </button>
              <button
                className="secondary-button"
                onClick={regenerateCurrentChapter}
                disabled={isGenerating}
                type="button"
              >
                {isGenerating ? "重新生成中..." : "重新生成章节"}
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  runChapterCheck(
                    activeChapterId,
                    activeParagraphs,
                    activeChapter?.goal || "",
                    activeChapter?.title || ""
                  )}
                disabled={isChecking}
                type="button"
              >
                {isChecking ? "检查中..." : "检查章节质量"}
              </button>
            </div>

            <div className="custom-instruction">
              <label htmlFor="custom-instruction">自定义修改要求</label>
              <textarea
                id="custom-instruction"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="例如：增加实证案例，强化理论分析，收束结论语气..."
                rows={3}
              />
              <button
                className="secondary-button"
                onClick={applyCustomInstruction}
                disabled={!customInstruction.trim()}
                type="button"
              >
                按要求修改
              </button>
            </div>
          </div>
        )}

        {message ? (
          <div className="message">
            <p>{message}</p>
          </div>
        ) : null}
      </section>

      <aside className="content-card stitch-panel writing-studio-rail">
        <div className="card-heading card-heading--stack">
          <span className="eyebrow">质量与证据</span>
          <h2>当前章节支持面板</h2>
          <p>这里负责帮你判断这一章写得够不够稳，证据和引用有没有跟上。</p>
        </div>

        <section className="writing-side-card">
          <strong>当前章节需要的证据</strong>
          <ul className="bullet-list">
            {(activeChapter?.evidenceNeeds ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="writing-side-card">
          <strong>当前项目引用</strong>
          <div className="stack-list">
            {references.map((item) => (
              <div key={item.id} className="line-item line-item--column">
                <strong>{item.title}</strong>
                <span>{item.source}</span>
                <span className="writing-inline-meta">{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="writing-side-card">
          <strong>可直接调用的图文材料</strong>
          <div className="stack-list">
            {assets.map((item) => (
              <div key={item.id} className="line-item line-item--column">
                <strong>{item.name}</strong>
                <span>
                  {item.type} · {item.usage}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="writing-side-card">
          <strong>当前项目风险</strong>
          <div className="stack-list">
            {checks.map((item) => (
              <div key={item.title} className="line-item line-item--column">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <span className="writing-inline-meta">{item.level}</span>
              </div>
            ))}
          </div>
        </section>

        {showAiAnalysis && aiAnalysisMap[activeChapterId] ? (
          <section className="ai-analysis">
            <div className="ai-analysis-header">
              <h3>AI 评估结果</h3>
              <button
                className="small-button"
                onClick={() => setShowAiAnalysis(false)}
                type="button"
              >
                关闭
              </button>
            </div>

            <div
              className={
                aiAnalysisMap[activeChapterId].quality.approved
                  ? "analysis-scorecard analysis-scorecard--pass"
                  : "analysis-scorecard analysis-scorecard--warn"
              }
            >
              <div className="analysis-scorecard__head">
                <strong>整体评分</strong>
                <span>{aiAnalysisMap[activeChapterId].quality.overallScore}/100</span>
              </div>
              <span
                className={
                  aiAnalysisMap[activeChapterId].quality.approved
                    ? "analysis-status analysis-status--pass"
                    : "analysis-status analysis-status--warn"
                }
              >
                {aiAnalysisMap[activeChapterId].quality.approved ? "通过" : "需改进"}
              </span>
            </div>

            <div className="quality-criteria">
              {aiAnalysisMap[activeChapterId].quality.criteria.map((criterion) => (
                <div key={criterion.name} className="criterion">
                  <div className="criterion__head">
                    <span>{criterion.name}</span>
                    <span>{criterion.score}/100</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${criterion.score}%` }}
                    />
                  </div>
                  <p className="criterion__feedback">{criterion.feedback}</p>
                </div>
              ))}
            </div>

            <div className="writing-side-card writing-side-card--nested">
              <strong>改进建议</strong>
              <ul className="suggestions-list">
                {aiAnalysisMap[activeChapterId].quality.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="chapter-stats">
              <span>字数：{aiAnalysisMap[activeChapterId].metadata.wordCount}</span>
              <span>阅读时间：{aiAnalysisMap[activeChapterId].metadata.estimatedReadingTime} 分钟</span>
              <span>主题：{aiAnalysisMap[activeChapterId].metadata.topics.join(" / ") || "待分析"}</span>
            </div>
          </section>
        ) : null}

        <section className="writing-side-card">
          <strong>当前会议规则</strong>
          <VenueRuleSelector selectedVenueId={venueProfile.id} />
        </section>
      </aside>
    </section>
  );
}
