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
          try {
            switch (taskType) {
              case 'topic_analysis':
                result = await orchestrateAIRequest({
                  taskType: 'direction',
                  prompt: `请为主题"${context.projectTitle}"生成 5 个具体的研究方向，每个方向包括名称、描述、研究价值和可行性分析。`,
                  systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术方向顾问。基于用户提供的主题，生成 3-5 个具体的研究方向，每个方向包括：
1. 方向名称
2. 简要描述（1-2 句话）
3. 研究价值
4. 可行性分析

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
                  temperature: 0.7,
                  enableFallback: true
                });
                break;
              case 'outline_generation':
                result = await orchestrateAIRequest({
                  taskType: 'strategy',
                  prompt: `请为论文"${context.projectTitle}"生成博士开题级别的详细大纲。
研究方向：${context.userInputs?.selectedDirection || '未指定'}
方向描述：${context.userInputs?.directionDescription || '未指定'}

要求：
1. 生成符合博士开题要求的大纲
2. 结构完整，逻辑严谨
3. 包含研究背景、文献综述、研究方法、研究结果、讨论和结论等章节
4. 每个章节要有明确的目标和摘要`,
                  systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文大纲专家。基于用户提供的主题和研究方向，生成博士开题级别的详细大纲。大纲应包括：
1. 绪论（研究背景、问题陈述、研究意义）
2. 文献综述（国内外研究现状、理论基础）
3. 研究方法（研究设计、数据收集与分析）
4. 研究结果（数据描述、结果分析）
5. 讨论（结果解释、理论贡献、实践意义）
6. 结论与展望（研究结论、局限、未来方向）

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
                  temperature: 0.7,
                  enableFallback: true
                });
                break;
              case 'content_generation':
                result = await orchestrateAIRequest({
                  taskType: 'content',
                  prompt: context.prompt,
                  systemPrompt: context.systemPrompt,
                  temperature: 0.5,
                  enableFallback: true
                });
                break;
              case 'review':
                result = await orchestrateAIRequest({
                  taskType: 'review',
                  prompt: `请对以下内容进行评审：\n\n${context.content}`,
                  systemPrompt: `你是一个面向服装、设计、时尚、人文社科与技术交叉研究的学术论文评审专家。请对用户提供的稿件进行全面评估，并提供具体的改进建议。评估应包括：
1. 整体质量评分（1-10 分）
2. 主要优点
3. 主要问题
4. 具体改进建议
5. 结构优化建议

输出必须结构清晰、学术表达克制，不要输出思考过程。`,
                  temperature: 0.5,
                  enableFallback: true
                });
                break;
              default:
                throw new Error(`Unknown task type: ${taskType}`);
            }
          } catch (aiError) {
            console.error('AI processing failed in stream:', aiError);
            // 使用默认内容作为回退
            result = {
              content: getDefaultContentForTask(taskType, context),
              fallback: true
            };
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

// 为不同任务类型生成默认内容
function getDefaultContentForTask(taskType: string, context: any): string {
  switch (taskType) {
    case 'topic_analysis':
      return `【研究方向建议】

1. **理论研究方向**
   深入研究相关理论基础，构建系统的理论框架。

2. **实证研究方向**
   通过数据收集和分析，验证研究假设。

3. **应用研究方向**
   关注研究成果的实际应用价值。

4. **跨学科研究方向**
   融合多学科知识和方法，从多角度探讨研究问题。

5. **方法创新方向**
   探索新的研究方法或改进现有方法。

【说明】AI 服务暂时不可用，以上为通用建议。`;

    case 'outline_generation':
      return `【论文大纲建议】

1. 绪论
   - 研究背景与意义
   - 国内外研究现状
   - 研究目标与内容

2. 理论基础与文献综述
   - 核心概念界定
   - 相关理论基础
   - 国内外研究综述

3. 研究设计
   - 研究框架
   - 研究方法
   - 数据来源

4. 研究结果与分析
   - 数据描述
   - 结果分析
   - 发现与讨论

5. 结论与展望
   - 研究结论
   - 理论贡献
   - 实践意义
   - 研究局限与展望

【说明】AI 服务暂时不可用，以上为通用大纲框架。`;

    case 'content_generation':
      return `【内容生成】

内容已根据您的要求生成。由于 AI 服务暂时不可用，以上为占位内容。建议您：
1. 提供具体的内容要求
2. 明确文章结构和重点
3. 补充相关背景信息

【说明】AI 服务暂时不可用，请稍后重试。`;

    case 'review':
      return `【评审意见】

【整体评价】
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

【说明】AI 服务暂时不可用，以上为通用评审意见。`;

    default:
      return 'AI 服务暂时不可用，请稍后重试。';
  }
}
