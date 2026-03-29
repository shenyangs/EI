import { NextRequest, NextResponse } from "next/server";

import {
  addAuditLog,
  archiveProjectRecord,
  restoreArchivedProject
} from "@/lib/server/admin-governance";
import { buildDataGovernanceSnapshot } from "@/lib/server/admin-insights";
import { authMiddleware, checkPermission } from "@/lib/server/auth-middleware";
import { memoryStore } from "@/lib/server/db";
import { getAllProjects } from "@/lib/server/project-db";

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

  const snapshot = await buildDataGovernanceSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}

export async function PATCH(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  const denied = deny(authResponse, "system:update");
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const action = body?.action as "archive" | "restore" | undefined;
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : "管理员手动归档";

  if (!projectId || !action) {
    return NextResponse.json({ ok: false, error: "缺少项目 ID 或操作类型。" }, { status: 400 });
  }

  if (action === "archive") {
    const allProjects = await getAllProjects();
    const project = allProjects.find((item) => item.id === projectId);
    if (!project) {
      return NextResponse.json({ ok: false, error: "项目不存在。" }, { status: 404 });
    }

    archiveProjectRecord({
      projectId: project.id,
      title: project.title,
      reason,
      archivedAt: new Date().toISOString(),
      archivedBy: "super_admin",
      lastKnownUpdatedAt: Number(project.updatedAt) || Date.now(),
      versionCount: memoryStore.projectVersions.filter((item) => item.projectId === project.id).length,
      referenceCount: memoryStore.projectReferences.filter((item) => item.projectId === project.id).length
    });

    addAuditLog({
      action: "归档项目",
      category: "系统",
      severity: "重要",
      actor: "super_admin",
      target: project.title,
      detail: `将项目 ${project.title} 归档，原因：${reason}。`
    });
  }

  if (action === "restore") {
    const restored = restoreArchivedProject(projectId);
    if (!restored) {
      return NextResponse.json({ ok: false, error: "归档记录不存在。" }, { status: 404 });
    }

    addAuditLog({
      action: "恢复项目",
      category: "系统",
      severity: "提示",
      actor: "super_admin",
      target: restored.title,
      detail: `恢复项目 ${restored.title}，重新回到主站列表。`
    });
  }

  const snapshot = await buildDataGovernanceSnapshot();
  return NextResponse.json({ ok: true, message: action === "archive" ? "项目已归档。" : "项目已恢复。", ...snapshot });
}
