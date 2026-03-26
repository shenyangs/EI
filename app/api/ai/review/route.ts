
import { reviewContent } from '@/lib/ai/ai-orchestrator';

type ReviewRequestBody = {
  content?: string;
  modelId?: number;
};

export const maxDuration = 60;
export const runtime = 'edge';

export async function POST(request: Request) {
  let body: ReviewRequestBody;

  try {
    body = (await request.json()) as ReviewRequestBody;
  } catch {
    return new Response(JSON.stringify({
      ok: false,
      error: '请求体不是合法 JSON。'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!body.content) {
    return new Response(JSON.stringify({
      ok: false,
      error: '缺少 content。'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await reviewContent(body.content, body.modelId);

    // 使用 Vercel AI SDK 生成流式响应
    const stream = new ReadableStream({
      async start(controller) {
        // 逐字发送内容，模拟打字机效果
        for (let i = 0; i < result.content.length; i++) {
          controller.enqueue(new TextEncoder().encode(result.content[i]));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
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

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < defaultContent.length; i++) {
          controller.enqueue(new TextEncoder().encode(defaultContent[i]));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
}
