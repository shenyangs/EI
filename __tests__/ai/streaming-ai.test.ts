import { streamAiTask } from '@/lib/streaming-ai';
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream } from 'stream/web';

describe('streamAiTask', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should parse SSE messages even when JSON is split across chunks', async () => {
    global.TextDecoder = TextDecoder as typeof global.TextDecoder;
    const encoder = new TextEncoder();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"thinking","data":{"status":"pro'));
          controller.enqueue(encoder.encode('gress","step":"分析中","progress":0.5}}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"content","data":{"status":"completed","content":"完成"}}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      })
    }) as any;

    const events = [];
    for await (const event of streamAiTask('topic_analysis', { projectTitle: '测试' })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: 'thinking',
        data: {
          status: 'progress',
          step: '分析中',
          progress: 0.5
        }
      },
      {
        type: 'content',
        data: {
          status: 'completed',
          content: '完成'
        }
      },
      {
        type: 'complete',
        data: null
      }
    ]);
  });
});
