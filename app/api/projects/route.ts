import { NextResponse } from "next/server";
import { createProject } from "@/lib/server/project-db";

export async function POST(request: Request) {
  let body: {
    title: string;
    description?: string;
    venueId?: string;
  };

  try {
    body = (await request.json()) as any;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少项目标题。"
      },
      { status: 400 }
    );
  }

  try {
    const project = await createProject({
      title: body.title,
      description: body.description,
      venueId: body.venueId
    });

    return NextResponse.json({
      ok: true,
      project
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建项目失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getProjects } = await import("@/lib/server/project-db");
    const projects = await getProjects();

    return NextResponse.json({
      ok: true,
      projects
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取项目列表失败。";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
