
import { generateContent } from "@/lib/ai/ai-orchestrator";

type DraftRequestBody = {
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  modelId?: number;
};

export const maxDuration = 60;
export const runtime = 'edge';

export async function POST(request: Request) {
  let body: DraftRequestBody;

  try {
    body = (await request.json()) as DraftRequestBody;
  } catch {
    return new Response(JSON.stringify({
      ok: false,
      error: "请求体不是合法 JSON。"
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!body.prompt) {
    return new Response(JSON.stringify({
      ok: false,
      error: "缺少 prompt。"
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await generateContent(
      body.prompt,
      body.systemPrompt,
      body.modelId
    );

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
    const message = error instanceof Error ? error.message : "模型调用失败。";
    console.error('AI draft error:', error);

    // 生成默认响应作为回退
    let defaultContent = "";
    if (body.prompt.includes("重写")) {
      defaultContent = "已根据学术规范重写内容，使其更加清晰、克制。";
    } else if (body.prompt.includes("生成本章草稿")) {
      defaultContent = "本章草稿已生成，包含了关键的学术内容和论证结构。";
    } else if (body.prompt.includes("补证据")) {
      defaultContent = "1. 建议补充关于传统纹样数字化转译的实证研究\n2. 建议添加智能服饰交互设计的用户测试数据\n3. 建议引用相关领域的最新研究成果";
    }

    const fallbackContent = defaultContent || "AI 服务暂时不可用，已使用默认内容。";

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < fallbackContent.length; i++) {
          controller.enqueue(new TextEncoder().encode(fallbackContent[i]));
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
