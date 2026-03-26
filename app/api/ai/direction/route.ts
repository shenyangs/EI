import { NextResponse } from 'next/server';
import { generateDirection } from '@/lib/ai/ai-orchestrator';

type DirectionRequestBody = {
  topic?: string;
  field?: string;
  modelId?: number;
};

export async function POST(request: Request) {
  let body: DirectionRequestBody;

  try {
    body = (await request.json()) as DirectionRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: '请求体不是合法 JSON。'
      },
      { status: 400 }
    );
  }

  if (!body.topic) {
    return NextResponse.json(
      {
        ok: false,
        error: '缺少 topic。'
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateDirection(body.topic, body.field, body.modelId);

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
    console.error('AI direction error:', error);

    // 生成默认研究方向作为回退
    const defaultContent = `【研究方向建议】

1. **理论研究方向**
   深入研究相关理论基础，构建系统的理论框架。重点关注领域内的核心理论问题，为后续研究奠定坚实基础。

2. **实证研究方向**
   通过数据收集和分析，验证研究假设。建议采用定量与定性相结合的方法，确保研究结论的可靠性。

3. **应用研究方向**
   关注研究成果的实际应用价值，探索在具体场景中的应用可能性。建议与行业实践相结合，提升研究的实用价值。

4. **跨学科研究方向**
   融合多学科知识和方法，从多角度探讨研究问题。建议关注学科交叉点，寻找创新突破口。

5. **方法创新方向**
   探索新的研究方法或改进现有方法，提升研究的科学性和有效性。建议关注前沿方法学发展。

【说明】
以上方向基于通用学术研究框架生成。如需更精准的建议，请提供详细的研究背景和具体需求。`;

    return NextResponse.json({
      ok: true,
      content: defaultContent,
      error: message,
      fallback: true
    });
  }
}
