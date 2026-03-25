"use client";

import { useState, useTransition } from "react";

type WritingWorkbenchProps = {
  projectTitle: string;
  sectionTitle: string;
  sectionGoals: string[];
  initialParagraphs: string[];
};

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

export function WritingWorkbench({
  projectTitle,
  sectionTitle,
  sectionGoals,
  initialParagraphs
}: WritingWorkbenchProps) {
  const [paragraphs, setParagraphs] = useState(initialParagraphs);
  const [hintText, setHintText] = useState("先逐章确认内容，再进入全文输出。");
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generateSectionDraft() {
    startTransition(async () => {
      setHintText("正在生成本章草稿...");

      const result = await requestDraft(
        `请用中文为论文《${projectTitle}》的“${sectionTitle}”章节生成 3 段正式草稿。
要求：
1. 语气学术但不要空泛
2. 结合以下章节目标：${sectionGoals.join("；")}
3. 不编造参考文献
4. 只返回正文内容，不要解释`
      );

      if (!result.ok || !result.content) {
        setHintText(result.error ?? "生成失败，请稍后再试。");
        return;
      }

      const nextParagraphs = result.content
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean);

      setParagraphs(nextParagraphs.length > 0 ? nextParagraphs : [result.content]);
      setHintText("本章草稿已更新，你可以继续逐段确认。");
    });
  }

  function rewriteFirstParagraph() {
    startTransition(async () => {
      setHintText("正在重写开头一段...");

      const result = await requestDraft(
        `请用中文重写下面这段论文内容，使它更像 EI 会议论文里的正式章节开头。
要求：
1. 保留原意
2. 更清晰、更克制
3. 只输出重写后的这一段

原文：
${paragraphs[0] ?? ""}`
      );

      if (!result.ok || !result.content) {
        setHintText(result.error ?? "重写失败，请稍后再试。");
        return;
      }

      setParagraphs((current) => {
        const next = [...current];
        next[0] = result.content!;
        return next;
      });
      setHintText("开头一段已经重写。");
    });
  }

  function insertCitationHint() {
    setParagraphs((current) => [
      ...current,
      "文献提示：[此处建议补充 1 条关于传统纹样数字化转译或智能服饰交互设计的正式引用]"
    ]);
    setHintText("已插入引用提示，后面可以替换成正式文献。");
  }

  function generateEvidenceHints() {
    startTransition(async () => {
      setHintText("正在生成补证据建议...");

      const result = await requestDraft(
        `请围绕论文《${projectTitle}》的“${sectionTitle}”章节，用中文列出 3 条需要补证据的点。
要求：
1. 每条一句话
2. 说明应该补什么类型的证据
3. 不要输出多余解释`
      );

      if (!result.ok || !result.content) {
        setHintText(result.error ?? "生成失败，请稍后再试。");
        return;
      }

      setHintText(result.content);
    });
  }

  return (
    <div className="workbench-stack">
      <div className="section-ribbon">
        <span>当前模式：分章节逐段确认</span>
        <span>{confirmed ? "本章已确认" : "本章未确认"}</span>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={generateSectionDraft} type="button">
          {isPending ? "生成中..." : "生成本章草稿"}
        </button>
        <button className="secondary-button" onClick={rewriteFirstParagraph} type="button">
          重写开头一段
        </button>
        <button className="secondary-button" onClick={insertCitationHint} type="button">
          插入引用提示
        </button>
        <button className="secondary-button" onClick={generateEvidenceHints} type="button">
          联网补证据建议
        </button>
        <button
          className={confirmed ? "secondary-button" : "primary-button"}
          onClick={() => {
            setConfirmed((current) => !current);
            setHintText(
              confirmed ? "已取消本章确认，你可以继续修改。" : "本章已确认，可以继续处理下一章。"
            );
          }}
          type="button"
        >
          {confirmed ? "取消本章确认" : "确认本章内容"}
        </button>
      </div>

      <div className="editor-surface">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>

      <div className="hint-panel">
        <strong>系统反馈</strong>
        <p>{hintText}</p>
      </div>
    </div>
  );
}
