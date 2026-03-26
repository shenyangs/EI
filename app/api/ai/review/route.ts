import { NextResponse } from 'next/server';
import { reviewContent } from '@/lib/ai/ai-orchestrator';

type ReviewRequestBody = {
  content?: string;
  modelId?: number;
};

export async function POST(request: Request) {
  let body: ReviewRequestBody;

  try {
    body = (await request.json()) as ReviewRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: '请求体不是合法 JSON。'
      },
      { status: 400 }
    );
  }

  if (!body.content) {
    return NextResponse.json(
      {
        ok: false,
        error: '缺少 content。'
      },
      { status: 400 }
    );
  }

  try {
    const result = await reviewContent(body.content, body.modelId);

    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      model: result.model,
      fallback: result.fallback,
      originalProvider: result.originalProvider
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型调用失败。';
    console.error('AI review error:', error);

    // 生成默认评审结果作为回退
    const defaultContent = `【整体评价】
内容整体结构完整，论述基本清晰，但仍有改进空间。

【主要优点】
1. 主题明确，研究方向清晰
2. 内容具有一定的学术价值
3. 结构基本完整

【主要问题】
1. 需要进一步加强理论深度
2. 建议补充更多实证支持
3. 部分论述需要更严谨的学术表达

【改进建议】
1. 强化理论基础，增加相关文献引用
2. 补充实证数据或案例支持
3. 优化语言表达，使其更符合学术规范
4. 检查逻辑结构，确保论证连贯

【结构优化建议】
建议按照"问题提出 - 理论分析 - 实证研究 - 结论与建议"的逻辑框架进行优化。`;

    return NextResponse.json({
      ok: true,
      content: defaultContent,
      error: message,
      fallback: true
    });
  }
}
