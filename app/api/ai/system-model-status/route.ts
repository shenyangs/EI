import { NextRequest, NextResponse } from "next/server";

import {
  getSystemDefaultModelStatus,
  type SystemModelProvider
} from "@/lib/ai-status";
import { authMiddleware, checkPermission } from "@/lib/server/auth-middleware";

function normalizeProvider(value: string | null): SystemModelProvider | null {
  if (value === "minimax") {
    return "minimax";
  }

  if (value === "google" || value === "gemini") {
    return "google";
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status !== 200) {
      return authResponse;
    }

    const userType = authResponse.headers.get("X-User-Type");
    const userId = authResponse.headers.get("X-User-Id") || undefined;
    if (!userType || !checkPermission(userType, "ai:read", false, userId)) {
      return NextResponse.json(
        { ok: false, error: "没有权限查看系统模型状态。" },
        { status: 403 }
      );
    }

    const provider = normalizeProvider(
      request.nextUrl.searchParams.get("provider")
    );

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "缺少有效的 provider 参数。" },
        { status: 400 }
      );
    }

    const status = await getSystemDefaultModelStatus(provider);

    return NextResponse.json({
      ok: true,
      status
    });
  } catch (error) {
    console.error("Failed to fetch system model status:", error);
    return NextResponse.json(
      { ok: false, error: "获取系统模型状态失败" },
      { status: 500 }
    );
  }
}
