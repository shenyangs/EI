import { NextRequest, NextResponse } from "next/server";

import { buildRiskAlertsSnapshot } from "@/lib/server/admin-insights";
import { authMiddleware, checkPermission } from "@/lib/server/auth-middleware";

function deny(authResponse: NextResponse, permission: string) {
  const userType = authResponse.headers.get("X-User-Type") || "admin";
  const isSuperAdmin = authResponse.headers.get("X-Is-Super-Admin") === "true";
  const userId = authResponse.headers.get("X-User-Id") || undefined;

  if (!checkPermission(userType, permission, isSuperAdmin, userId)) {
    return NextResponse.json({ ok: false, error: "当前管理员没有这项权限。" }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = deny(authResponse, "system:read");
  if (denied) {
    return denied;
  }

  const snapshot = await buildRiskAlertsSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
