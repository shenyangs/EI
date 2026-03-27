"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { streamAiTask, type StreamChunk } from "@/lib/streaming-ai";

type StreamingPhase = 
  | "idle"
  | "thinking"
  | "generating"
  | "checking"
  | "complete"
  | "error";

type StreamingAiPanelProps = {
  taskType: string;
  context: any;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
};

export function StreamingAiPanel({
  taskType,
  context,
  onComplete,
  onError
}: StreamingAiPanelProps) {
  const [phase, setPhase] = useState<StreamingPhase>("idle");
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState("");
  const [contentProgress, setContentProgress] = useState(0);
  const [qualityResult, setQualityResult] = useState<any>(null);
  const [nextSteps, setNextSteps] = useState<any[]>([]);
  const [, setRevisionResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const generatedContentRef = useRef("");
  const qualityResultRef = useRef<any>(null);
  const nextStepsRef = useRef<any[]>([]);
  const revisionResultRef = useRef<any[]>([]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent]);

  const handleThinkingChunk = useCallback((data: any) => {
    if (data.status === "progress" && data.step) {
      setThinkingSteps(prev => [...prev, data.step]);
      setThinkingProgress(data.progress || 0);
    } else if (data.status === "completed") {
      setPhase("generating");
    } else if (data.thoughts) {
      setThinkingSteps((prev) => [...prev, data.thoughts]);
      setThinkingProgress(data.confidence ?? 0.3);
    }
  }, []);

  const handleContentChunk = useCallback((data: any) => {
    if (data.status === "progress" && data.chunk) {
      setGeneratedContent((prev) => {
        const next = prev + data.chunk;
        generatedContentRef.current = next;
        return next;
      });
      setContentProgress(data.progress || 0);
    } else if (data.status === "completed") {
      const finalContent = data.content || "";
      generatedContentRef.current = finalContent;
      setGeneratedContent(finalContent);
      setPhase("checking");
    } else if (typeof data.content === "string") {
      generatedContentRef.current = data.content;
      setGeneratedContent(data.content);
      setPhase("checking");
    } else if (typeof data.chunk === "string") {
      setGeneratedContent((prev) => {
        const next = prev + data.chunk;
        generatedContentRef.current = next;
        return next;
      });
    }
  }, []);

  const handleQualityChunk = useCallback((data: any) => {
    if (data.status === "completed" && data.quality) {
      setQualityResult(data.quality);
      qualityResultRef.current = data.quality;
    }
  }, []);

  const handleNextStepsChunk = useCallback((data: any) => {
    if (data.nextSteps) {
      setNextSteps(data.nextSteps);
      nextStepsRef.current = data.nextSteps;
    }
  }, []);

  const handleRevisionChunk = useCallback((data: any) => {
    const revisions = Array.isArray(data?.revisions)
      ? data.revisions
      : Array.isArray(data)
        ? data
        : [];

    if (revisions.length > 0) {
      setRevisionResult(revisions);
      revisionResultRef.current = revisions;
    }
  }, []);

  const handleStreamChunk = useCallback((chunk: StreamChunk) => {
    switch (chunk.type) {
      case "thinking":
        handleThinkingChunk(chunk.data);
        break;
      case "content":
        handleContentChunk(chunk.data);
        break;
      case "quality":
        handleQualityChunk(chunk.data);
        break;
      case "next_steps":
        handleNextStepsChunk(chunk.data);
        break;
      case "revision":
        handleRevisionChunk(chunk.data);
        break;
      case "error":
        setError(chunk.data.message);
        setPhase("error");
        onError?.(chunk.data.message);
        break;
      case "complete":
        setPhase("complete");
        onComplete?.({
          content: generatedContentRef.current,
          quality: qualityResultRef.current,
          nextSteps: nextStepsRef.current,
          revisions: revisionResultRef.current
        });
        break;
    }
  }, [handleContentChunk, handleNextStepsChunk, handleQualityChunk, handleRevisionChunk, handleThinkingChunk, onComplete, onError]);

  useEffect(() => {
    let cancelled = false;

    async function startStreaming() {
      setPhase("thinking");
      setThinkingProgress(0);
      setThinkingSteps([]);
      setGeneratedContent("");
      setContentProgress(0);
      setQualityResult(null);
      setNextSteps([]);
      setRevisionResult([]);
      setError(null);
      generatedContentRef.current = "";
      qualityResultRef.current = null;
      nextStepsRef.current = [];
      revisionResultRef.current = [];

      try {
        const generator = streamAiTask(taskType, context);

        for await (const chunk of generator) {
          if (cancelled) break;

          handleStreamChunk(chunk);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "流式处理失败";
        setError(errorMessage);
        setPhase("error");
        onError?.(errorMessage);
      }
    }

    void startStreaming();

    return () => {
      cancelled = true;
    };
  }, [context, handleStreamChunk, onError, onComplete, taskType]);

  const getPhaseTitle = () => {
    switch (phase) {
      case "thinking":
        return "AI 正在深度思考...";
      case "generating":
        return "AI 正在生成内容...";
      case "checking":
        return "AI 正在进行质量检查...";
      case "complete":
        return "内容生成完成";
      case "error":
        return "生成过程出错";
      default:
        return "准备中...";
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case "thinking":
        return "AI 正在分析任务需求、理解上下文、评估可行路径...";
      case "generating":
        return "AI 正在根据思考结果生成高质量内容，请稍候...";
      case "checking":
        return "AI 正在从学术性、逻辑性、完整性等多个维度评估内容质量...";
      case "complete":
        return "内容已生成并通过质量检查，可以继续下一步操作。";
      case "error":
        return error || "生成过程中出现错误，请稍后重试。";
      default:
        return "正在初始化...";
    }
  };

  return (
    <div className="streaming-panel">
      {/* 阶段指示器 */}
      <div className="streaming-header">
        <div className="phase-indicator">
          <div className={`phase-dot ${phase === "thinking" ? "active" : ""}`} />
          <div className={`phase-line ${phase === "generating" || phase === "checking" || phase === "complete" ? "completed" : ""}`} />
          <div className={`phase-dot ${phase === "generating" ? "active" : phase === "checking" || phase === "complete" ? "completed" : ""}`} />
          <div className={`phase-line ${phase === "checking" || phase === "complete" ? "completed" : ""}`} />
          <div className={`phase-dot ${phase === "checking" ? "active" : phase === "complete" ? "completed" : ""}`} />
          <div className={`phase-line ${phase === "complete" ? "completed" : ""}`} />
          <div className={`phase-dot ${phase === "complete" ? "completed" : ""}`} />
        </div>
        <h3 className="phase-title">{getPhaseTitle()}</h3>
        <p className="phase-description">{getPhaseDescription()}</p>
      </div>

      {/* 思考过程展示 */}
      {phase === "thinking" && (
        <div className="thinking-section">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${thinkingProgress * 100}%` }}
            />
          </div>
          <div className="thinking-steps">
            {thinkingSteps.map((step, index) => (
              <div key={index} className="thinking-step">
                <span className="step-number">{index + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 内容生成展示 */}
      {(phase === "generating" || phase === "checking" || phase === "complete") && (
        <div className="content-section">
          {phase === "generating" && (
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${contentProgress * 100}%` }}
              />
            </div>
          )}
          <div 
            ref={contentRef}
            className="generated-content"
          >
            {generatedContent}
            {phase === "generating" && <span className="typing-cursor">|</span>}
          </div>
        </div>
      )}

      {/* 质量检查结果 */}
      {qualityResult && (phase === "checking" || phase === "complete") && (
        <div className="quality-section">
          <div className="quality-header">
            <span className="quality-score">
              质量评分: {qualityResult.overallScore}/100
            </span>
            <span className={`quality-badge ${qualityResult.approved ? "approved" : "rejected"}`}>
              {qualityResult.approved ? "已通过" : "需改进"}
            </span>
          </div>
          {qualityResult.suggestions && qualityResult.suggestions.length > 0 && (
            <div className="quality-suggestions">
              <h4>改进建议:</h4>
              <ul>
                {qualityResult.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 下一步预览 */}
      {nextSteps.length > 0 && phase === "complete" && (
        <div className="next-steps-section">
          <h4>下一步预览:</h4>
          <div className="next-steps-list">
            {nextSteps.map((step, index) => (
              <div key={index} className="next-step-item">
                <span className="step-name">{step.step}</span>
                <span className="step-time">预计 {step.estimatedTime} 分钟</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {phase === "error" && (
        <div className="error-section">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
        </div>
      )}

      <style jsx>{`
        .streaming-panel {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
        }

        .streaming-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .phase-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .phase-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e2e8f0;
          transition: all 0.3s ease;
        }

        .phase-dot.active {
          background: #3b82f6;
          animation: pulse 1.5s infinite;
        }

        .phase-dot.completed {
          background: #10b981;
        }

        .phase-line {
          width: 40px;
          height: 2px;
          background: #e2e8f0;
          transition: all 0.3s ease;
        }

        .phase-line.completed {
          background: #10b981;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        .phase-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .phase-description {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .thinking-section {
          margin-bottom: 20px;
        }

        .thinking-steps {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .thinking-step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
        }

        .step-number {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-text {
          font-size: 0.875rem;
          color: #374151;
        }

        .content-section {
          margin-bottom: 20px;
        }

        .generated-content {
          max-height: 400px;
          overflow-y: auto;
          padding: 16px;
          background: white;
          border-radius: 8px;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1.2em;
          background: #3b82f6;
          margin-left: 2px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .quality-section {
          background: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .quality-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .quality-score {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .quality-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .quality-badge.approved {
          background: #dcfce7;
          color: #166534;
        }

        .quality-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }

        .quality-suggestions h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .quality-suggestions ul {
          margin: 0;
          padding-left: 16px;
          font-size: 0.875rem;
          color: #64748b;
        }

        .quality-suggestions li {
          margin-bottom: 4px;
        }

        .next-steps-section {
          background: white;
          border-radius: 8px;
          padding: 16px;
        }

        .next-steps-section h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .next-steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .next-step-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f1f5f9;
          border-radius: 6px;
        }

        .step-name {
          font-size: 0.875rem;
          color: #374151;
        }

        .step-time {
          font-size: 0.75rem;
          color: #64748b;
        }

        .error-section {
          text-align: center;
          padding: 24px;
        }

        .error-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .error-message {
          font-size: 0.875rem;
          color: #dc2626;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
