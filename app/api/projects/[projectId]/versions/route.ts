import { NextResponse } from "next/server";

import { createProjectVersion, listProjectVersions } from "@/lib/server/project-version-store";
import type {
  CreateProjectVersionInput,
  ProjectVersionPayload
} from "@/lib/project-version-types";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? undefined;

  try {
    const versions = await listProjectVersions(projectId, key);

    return NextResponse.json({
      ok: true,
      versions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取版本记录失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  let body: CreateProjectVersionInput<ProjectVersionPayload>;

  try {
    body = (await request.json()) as CreateProjectVersionInput<ProjectVersionPayload>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.key?.trim() || !body.title?.trim() || !body.summary?.trim() || !body.fingerprint?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少必要的版本信息。"
      },
      { status: 400 }
    );
  }

  if (!body.payload || typeof body.payload !== "object" || !("type" in body.payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少合法的版本快照。"
      },
      { status: 400 }
    );
  }

  try {
    const version = await createProjectVersion(projectId, body);

    return NextResponse.json({
      ok: true,
      version
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存版本失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
