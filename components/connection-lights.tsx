"use client";

import { useEffect, useState } from "react";

type ConnectionLightsProps = {
  initialModelConnected: boolean;
  initialWebSearchConnected: boolean;
};

type StatusResponse = {
  modelConnected?: boolean;
  webSearchConnected?: boolean;
};

export function ConnectionLights({
  initialModelConnected,
  initialWebSearchConnected
}: ConnectionLightsProps) {
  const [modelConnected, setModelConnected] = useState(initialModelConnected);
  const [webSearchConnected, setWebSearchConnected] = useState(initialWebSearchConnected);

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

        setModelConnected(Boolean(data.modelConnected));
        setWebSearchConnected(Boolean(data.webSearchConnected));
      } catch {
        if (cancelled) {
          return;
        }

        setModelConnected(false);
        setWebSearchConnected(false);
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
            modelConnected
              ? "status-light__dot status-light__dot--online"
              : "status-light__dot status-light__dot--offline"
          }
        />
        <span>AI 模型</span>
      </div>
      <div className="status-light">
        <span
          className={
            webSearchConnected
              ? "status-light__dot status-light__dot--online"
              : "status-light__dot status-light__dot--offline"
          }
        />
        <span>联网搜索</span>
      </div>
    </div>
  );
}
