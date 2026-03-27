import { TextDecoder as NodeTextDecoder } from 'util';

export type StreamChunk = {
  type: 'thinking' | 'content' | 'quality' | 'next_steps' | 'revision' | 'error' | 'complete';
  data: any;
};

export type StreamCallbacks = {
  onThinking?: (data: any) => void;
  onContent?: (data: any) => void;
  onQuality?: (data: any) => void;
  onNextSteps?: (data: any) => void;
  onRevision?: (data: any) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
};

export class StreamingAiProcessor {
  private callbacks: StreamCallbacks;
  private buffer: string = '';

  constructor(callbacks: StreamCallbacks) {
    this.callbacks = callbacks;
  }

  processChunk(chunk: string) {
    this.buffer += chunk;
    
    // 尝试解析完整的 JSON 对象
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) break;
      
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      
      if (!line) continue;
      
      try {
        const parsed = JSON.parse(line) as StreamChunk;
        this.handleChunk(parsed);
      } catch {
        // 如果不是有效的 JSON，可能是流式内容的一部分
        if (this.callbacks.onContent && line) {
          this.callbacks.onContent({ chunk: line });
        }
      }
    }
  }

  private handleChunk(chunk: StreamChunk) {
    switch (chunk.type) {
      case 'thinking':
        this.callbacks.onThinking?.(chunk.data);
        break;
      case 'content':
        this.callbacks.onContent?.(chunk.data);
        break;
      case 'quality':
        this.callbacks.onQuality?.(chunk.data);
        break;
      case 'next_steps':
        this.callbacks.onNextSteps?.(chunk.data);
        break;
      case 'revision':
        this.callbacks.onRevision?.(chunk.data);
        break;
      case 'error':
        this.callbacks.onError?.(chunk.data);
        break;
      case 'complete':
        this.callbacks.onComplete?.();
        break;
    }
  }

  flush() {
    if (this.buffer.trim()) {
      try {
        const parsed = JSON.parse(this.buffer.trim()) as StreamChunk;
        this.handleChunk(parsed);
      } catch {
        // 忽略无法解析的剩余内容
      }
    }
    this.buffer = '';
  }
}

export async function* streamAiTask(
  taskType: string,
  context: any
): AsyncGenerator<StreamChunk, void, unknown> {
  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      taskType,
      context
    })
  });

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const Decoder = globalThis.TextDecoder || NodeTextDecoder;
  const decoder = new Decoder();
  let buffer = '';

  const parseEvent = (rawEvent: string): StreamChunk | null => {
    const lines = rawEvent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (!line.startsWith('data:')) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data) {
        continue;
      }

      if (data === '[DONE]') {
        return { type: 'complete', data: null };
      }

      try {
        return JSON.parse(data) as StreamChunk;
      } catch {
        return { type: 'content', data: { chunk: data } };
      }
    }

    return null;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
      } else {
        buffer += decoder.decode(value, { stream: true });
      }

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const parsed = parseEvent(rawEvent);
        if (parsed) {
          yield parsed;
          if (parsed.type === 'complete') {
            return;
          }
        }

        separatorIndex = buffer.indexOf('\n\n');
      }

      if (done) {
        const trailing = parseEvent(buffer);
        if (trailing) {
          yield trailing;
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
