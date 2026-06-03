import type {
  CommentSingleGenerateInput,
  CommentSingleGenerateResult,
  CommentSingleGenerateStreamEvent,
} from '@package/shared';

type StreamCallbacks = {
  onDelta: (content: string) => void;
};

type ErrorResponse = {
  error?: {
    message?: unknown;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function generateSingleCommentStream(
  input: CommentSingleGenerateInput,
  callbacks: StreamCallbacks
): Promise<CommentSingleGenerateResult> {
  const response = await fetch(`${apiUrl}/api/comments/single/generate/stream`, {
    body: JSON.stringify(input),
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response));
  }

  if (!response.body) {
    throw new Error('评语生成服务没有返回流式内容。');
  }

  return readCommentStream(response.body, callbacks);
}

async function readCommentStream(
  body: ReadableStream<Uint8Array>,
  callbacks: StreamCallbacks
): Promise<CommentSingleGenerateResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: CommentSingleGenerateResult | null = null;

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const parsed = readServerSentEventData(buffer);

      buffer = parsed.remaining;

      for (const rawData of parsed.data) {
        const event = parseStreamEvent(rawData);

        if (event.type === 'delta') {
          callbacks.onDelta(event.content);
        }

        if (event.type === 'result') {
          result = event.result;
        }

        if (event.type === 'error') {
          throw new Error(event.message);
        }
      }
    }

    if (done) {
      break;
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    for (const rawData of readServerSentEventData(`${buffer}\n\n`).data) {
      const event = parseStreamEvent(rawData);

      if (event.type === 'delta') {
        callbacks.onDelta(event.content);
      }

      if (event.type === 'result') {
        result = event.result;
      }

      if (event.type === 'error') {
        throw new Error(event.message);
      }
    }
  }

  if (!result) {
    throw new Error('评语生成服务没有返回最终结果。');
  }

  return result;
}

function readServerSentEventData(buffer: string): { data: string[]; remaining: string } {
  let remaining = buffer.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const data: string[] = [];
  let separatorIndex = remaining.indexOf('\n\n');

  while (separatorIndex >= 0) {
    const eventBlock = remaining.slice(0, separatorIndex);

    remaining = remaining.slice(separatorIndex + 2);

    const eventData = eventBlock
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();

    if (eventData) {
      data.push(eventData);
    }

    separatorIndex = remaining.indexOf('\n\n');
  }

  return { data, remaining };
}

function parseStreamEvent(rawData: string): CommentSingleGenerateStreamEvent {
  const parsed = JSON.parse(rawData) as unknown;

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    throw new Error('评语生成服务返回了无效的流式事件。');
  }

  if (parsed.type === 'delta' && typeof parsed.content === 'string') {
    return { type: 'delta', content: parsed.content };
  }

  if (parsed.type === 'result' && isCommentResult(parsed.result)) {
    return { type: 'result', result: parsed.result };
  }

  if (parsed.type === 'done') {
    return { type: 'done' };
  }

  if (
    parsed.type === 'error' &&
    typeof parsed.code === 'string' &&
    typeof parsed.message === 'string'
  ) {
    return { type: 'error', code: parsed.code, message: parsed.message };
  }

  throw new Error('评语生成服务返回了无法识别的流式事件。');
}

function isCommentResult(value: unknown): value is CommentSingleGenerateResult {
  return (
    isRecord(value) &&
    typeof value.sessionId === 'string' &&
    Array.isArray(value.comments) &&
    value.comments.every((comment) => typeof comment === 'string') &&
    isRecord(value.credit) &&
    typeof value.credit.remaining === 'number'
  );
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const fallback = '评语生成失败，请稍后重试。';

  try {
    const body = (await response.json()) as ErrorResponse;
    const message = body.error?.message;

    return typeof message === 'string' && message.trim() ? message : fallback;
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
