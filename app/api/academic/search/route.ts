import { NextResponse } from "next/server";

import { searchAcademicPapers } from "@/lib/academic-search";

type SearchRequestBody = {
  projectTitle?: string;
  discipline?: string;
  queries?: string[];
  userNote?: string;
  limitPerSource?: number;
};

function buildFallbackQueries(body: SearchRequestBody) {
  const projectTitle = body.projectTitle?.trim() ?? "";
  const discipline = body.discipline?.trim() ?? "";
  const userNote = body.userNote?.trim() ?? "";

  return [projectTitle, `${projectTitle} ${discipline}`.trim(), `${projectTitle} ${userNote}`.trim()].filter(Boolean);
}

export async function POST(request: Request) {
  let body: SearchRequestBody;

  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "请求体不是合法 JSON。"
      },
      { status: 400 }
    );
  }

  const queries = [...new Set([...(body.queries ?? []), ...buildFallbackQueries(body)])].filter(Boolean);

  if (queries.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少检索词。"
      },
      { status: 400 }
    );
  }

  try {
    const result = await searchAcademicPapers({
      queries,
      limitPerSource: body.limitPerSource ?? 6
    });

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "学术检索失败。"
      },
      { status: 500 }
    );
  }
}
