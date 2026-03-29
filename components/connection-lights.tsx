"use client";

import { useEffect, useState } from "react";

type ConnectionLightsProps = {
  initialModelConnected: boolean;
  initialWebSearchConnected: boolean;
  initialPending?: boolean;
  initialModelInfo?: {
    provider: string;
    model: string;
  };
};

type StatusResponse = {
  canGeneratePaperDraft?: boolean;
  canUseWebSearch?: boolean;
  provider?: string;
  model?: string;
};

export function ConnectionLights({
  initialModelConnected,
  initialWebSearchConnected,
  initialPending = false,
  initialModelInfo
}: ConnectionLightsProps) {
  const [modelConnected, setModelConnected] = useState(initialModelConnected);
  const [webSearchConnected, setWebSearchConnected] = useState(initialWebSearchConnected);
  const [pending, setPending] = useState(initialPending);
  const [modelInfo, setModelInfo] = useState<{ provider: string; model: string }>(
    initialModelInfo ?? {
      provider: "minimax",
      model: "MiniMax-M2.7"
    }
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshStatus() {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("status request failed");
        }

        const data = (await response.json()) as StatusResponse;

        if (cancelled) {
          return;
        }

        setModelConnected(Boolean(data.canGeneratePaperDraft));
        setWebSearchConnected(Boolean(data.canUseWebSearch));
        setModelInfo({
          provider: data.provider || "minimax",
          model: data.model || "MiniMax-M2.7"
        });
        setPending(false);
      } catch {
        if (cancelled) {
          return;
        }

        setModelConnected(false);
        setWebSearchConnected(false);
        setPending(false);
      }
    }

    void refreshStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="status-lights" aria-label="系统连通状态">
      <div className="status-light">
        <span
          className={
            pending
              ? "status-light__dot status-light__dot--pending"
              : modelConnected
              ? "status-light__dot status-light__dot--online"
              : "status-light__dot status-light__dot--offline"
          }
        />
        <span>AI 模型</span>
        <span className="status-light__model">
          {modelInfo.model}
        </span>
        <span className="status-light__state">
          {pending ? "探测中" : modelConnected ? "已连通" : "未连通"}
        </span>
      </div>
      <div className="status-light">
        <span
          className={
            pending
              ? "status-light__dot status-light__dot--pending"
              : webSearchConnected
              ? "status-light__dot status-light__dot--online"
              : "status-light__dot status-light__dot--offline"
          }
        />
        <span>联网搜索</span>
        <span className="status-light__state">
          {pending ? "探测中" : webSearchConnected ? "已连通" : "未连通"}
        </span>
      </div>
    </div>
  );
}
