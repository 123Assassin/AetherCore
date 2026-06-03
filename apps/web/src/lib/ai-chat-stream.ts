import type { AiChatSendInput, AiStreamEvent, AiWorkflowName } from '@package/shared';

type StreamCallbacks = {
  onEvent: (event: AiStreamEvent) => void;
};

type AiChatStreamResult = {
  events: AiStreamEvent[];
  messageId: string;
  sessionId: string;
};

type ErrorResponse = {
  error?: {
    message?: unknown;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const workflowNames = ['comment', 'inspiration', 'teaching'] as const;

export async function sendAiChatStream(
  input: AiChatSendInput,
  callbacks: StreamCallbacks
): Promise<AiChatStreamResult> {
  const response = await fetch(`${apiUrl}/api/ai/chat/stream`, {
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
    throw new Error('AI 助手没有返回流式内容。');
  }

  return readAiChatStream(response.body, callbacks);
}

async function readAiChatStream(
  body: ReadableStream<Uint8Array>,
  callbacks: StreamCallbacks
): Promise<AiChatStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: AiStreamEvent[] = [];
  let buffer = '';
  let messageId: string | null = null;
  let sessionId: string | null = null;

  const handleEvent = (event: AiStreamEvent) => {
    if (event.type === 'error') {
      throw new Error(event.message);
    }

    if (event.type === 'session') {
      sessionId = event.sessionId;
    }

    if (event.type === 'done') {
      messageId = event.messageId;
    }

    events.push(event);
    callbacks.onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const parsed = readServerSentEventData(buffer);

      buffer = parsed.remaining;

      for (const rawData of parsed.data) {
        handleEvent(parseStreamEvent(rawData));
      }
    }

    if (done) {
      break;
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    for (const rawData of readServerSentEventData(`${buffer}\n\n`).data) {
      handleEvent(parseStreamEvent(rawData));
    }
  }

  if (!sessionId || !messageId) {
    throw new Error('AI 助手响应未完整结束。');
  }

  return {
    events,
    messageId,
    sessionId,
  };
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

function parseStreamEvent(rawData: string): AiStreamEvent {
  const parsed = JSON.parse(rawData) as unknown;

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    throw new Error('AI 助手返回了无效的流式事件。');
  }

  if (parsed.type === 'session' && typeof parsed.sessionId === 'string') {
    return { type: 'session', sessionId: parsed.sessionId };
  }

  if (parsed.type === 'delta' && typeof parsed.content === 'string') {
    return { type: 'delta', content: parsed.content };
  }

  if (
    parsed.type === 'suggestions' &&
    Array.isArray(parsed.suggestions) &&
    parsed.suggestions.every((item) => typeof item === 'string')
  ) {
    return { type: 'suggestions', suggestions: parsed.suggestions };
  }

  if (
    parsed.type === 'workflow' &&
    isWorkflowName(parsed.workflowName) &&
    typeof parsed.redirectTo === 'string'
  ) {
    return {
      type: 'workflow',
      redirectTo: parsed.redirectTo,
      workflowName: parsed.workflowName,
    };
  }

  if (parsed.type === 'credit' && typeof parsed.remaining === 'number') {
    return { type: 'credit', remaining: parsed.remaining };
  }

  if (parsed.type === 'done' && typeof parsed.messageId === 'string') {
    return { type: 'done', messageId: parsed.messageId };
  }

  if (
    parsed.type === 'error' &&
    typeof parsed.code === 'string' &&
    typeof parsed.message === 'string'
  ) {
    return { type: 'error', code: parsed.code, message: parsed.message };
  }

  throw new Error('AI 助手返回了无法识别的流式事件。');
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const fallback = 'AI 助手服务不可用，请稍后重试。';

  try {
    const body = (await response.json()) as ErrorResponse;
    const message = body.error?.message;

    return typeof message === 'string' && message.trim() ? message : fallback;
  } catch {
    return fallback;
  }
}

function isWorkflowName(value: unknown): value is AiWorkflowName {
  return typeof value === 'string' && workflowNames.includes(value as AiWorkflowName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
