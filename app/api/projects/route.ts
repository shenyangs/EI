import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/server/project-db";
import { authMiddleware, checkPermission } from "@/lib/server/auth-middleware";

export async function POST(request: NextRequest) {
  // 尝试认证（可选）
  let userType = 'student'; // 默认用户类型
  
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse.status === 200) {
      const authenticatedUserType = authResponse.headers.get('X-User-Type');
      if (authenticatedUserType) {
        userType = authenticatedUserType;
      }
    }
  } catch (error) {
    // 认证失败，使用默认用户类型
  }

  // 检查权限（默认学生用户应该有创建项目的权限）
  if (!checkPermission(userType, 'project:create')) {
    return NextResponse.json(
      {
        ok: false,
        error: "没有权限创建项目。"
      },
      { status: 403 }
    );
  }

  let body: {
    title: string;
    subject?: string;
    keywords?: string;
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
      subject: body.subject,
      keywords: body.keywords,
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

export async function GET(request: NextRequest) {
  // 验证用户认证
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // 检查用户权限
  const userType = authResponse.headers.get('X-User-Type');
  if (!userType || !checkPermission(userType, 'project:read')) {
    return NextResponse.json(
      {
        ok: false,
        error: "没有权限查看项目。"
      },
      { status: 403 }
    );
  }

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
