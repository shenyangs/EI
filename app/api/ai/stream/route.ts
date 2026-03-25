import { NextResponse } from 'next/server';
import { orchestrateAIRequest } from '@/lib/ai/ai-orchestrator';

export async function POST(request: Request) {
  try {
    const { taskType, context } = await request.json();

    // 设置流式响应
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送思考过程
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'thinking',
            data: {
              thoughts: '正在分析任务类型...',
              confidence: 0
            }
          }) + '\n\n'));

          // 模拟处理延迟
          await new Promise(resolve => setTimeout(resolve, 500));

          // 根据任务类型执行不同的操作
          let result;
          switch (taskType) {
            case 'topic_analysis':
              result = await orchestrateAIRequest({
                taskType: 'direction',
                prompt: `请为主题"${context.projectTitle}"生成5个具体的研究方向，每个方向包括名称、描述、研究价值和可行性分析。`,
                systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术方向顾问。基于用户提供的主题，生成3-5个具体的研究方向，每个方向包括：
1. 方向名称
2. 简要描述（1-2句话）
3. 研究价值
4. 可行性分析

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
                temperature: 0.7
              });
              break;
            case 'content_generation':
              result = await orchestrateAIRequest({
                taskType: 'content',
                prompt: context.prompt,
                systemPrompt: context.systemPrompt,
                temperature: 0.5
              });
              break;
            case 'review':
              result = await orchestrateAIRequest({
                taskType: 'review',
                prompt: `请对以下内容进行评审：\n\n${context.content}`,
                systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文评审专家。请对用户提供的稿件进行全面评估，并提供具体的改进建议。评估应包括：
1. 整体质量评分（1-10分）
2. 主要优点
3. 主要问题
4. 具体改进建议
5. 结构优化建议

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
                temperature: 0.5
              });
              break;
            default:
              throw new Error('Unknown task type');
          }

          // 发送内容
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'content',
            data: { content: result.content }
          }) + '\n\n'));

          // 发送完成信号
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            data: { message: error instanceof Error ? error.message : 'Stream failed' }
          }) + '\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    );
  }
}
