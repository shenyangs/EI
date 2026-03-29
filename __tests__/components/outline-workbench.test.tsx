import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { OutlineWorkbench } from "@/components/outline-workbench";

jest.mock("@/components/archive-action-panel", () => ({
  ArchiveActionPanel: () => null
}));

jest.mock("@/components/quality-review-panel", () => ({
  QualityReviewPanel: () => null
}));

jest.mock("@/components/status-badge", () => ({
  StatusBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>
}));

jest.mock("@/components/streaming-ai-panel", () => ({
  StreamingAiPanel: () => null
}));

jest.mock("@/components/version-history-panel", () => ({
  VersionHistoryPanel: () => null
}));

jest.mock("@/lib/project-archive", () => ({
  createArchiveFingerprint: () => "fingerprint",
  shortenArchiveText: (text: string) => text,
  useProjectArchive: () => ({
    archiveCurrent: ({ key, fingerprint, title, summary }: {
      key: string;
      fingerprint: string;
      title: string;
      summary: string;
    }) => ({
      key,
      fingerprint,
      title,
      summary,
      archivedAt: "2026-03-29T00:00:00.000Z"
    }),
    getRecord: () => null,
    isReady: true,
    matchesCurrent: () => false,
    upsertRecord: jest.fn()
  })
}));

jest.mock("@/lib/project-version-client", () => ({
  useProjectVersionHistory: () => ({
    error: null,
    loading: false,
    saveVersion: jest.fn().mockResolvedValue({
      createdAt: "2026-03-29T00:00:00.000Z"
    }),
    saving: false,
    versions: []
  })
}));

describe("OutlineWorkbench", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        overall: "通过",
        summary: "检查完成",
        checks: [],
        rewritePriorities: [],
        metrics: {
          charCount: 120,
          paragraphCount: 1
        }
      })
    }) as jest.Mock;
  });

  it("在没有研究方向时自动降级到默认大纲，而不是一直停留在加载中", async () => {
    render(
      <OutlineWorkbench
        projectId="project-1"
        projectTitle="宜兴紫砂 AI 技术研究"
        venueId="ieee-iccci-2026"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("框架包列表")).toBeTruthy();
    });

    expect(screen.queryByText("AI 正在生成详细论文框架...")).toBeNull();
    expect(screen.getAllByText("默认版本").length).toBeGreaterThan(0);
    expect(screen.getByText("先定一套框架包，再进入正文写作。")).toBeTruthy();
  });
});
