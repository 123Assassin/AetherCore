import { decryptEngineApiKey } from '../admin-resources/engine-api-key.crypto.js';

export type AiAgentRuntimeConfig = {
  agent: {
    id: string;
    key: 'chat' | 'inspiration' | 'comment' | 'teaching';
    grade?: string | null;
    subject?: string | null;
    name: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    status: 'enabled' | 'disabled';
  };
  engine: AiEngineRuntimeConfig;
  prompt: {
    id: string;
    content: string;
  } | null;
  sensitiveWordList: {
    id: string;
    words: string[];
  } | null;
};

export type AiEngineRuntimeConfig = {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKeyCiphertext: string;
  modelName: string | null;
  status: 'enabled' | 'disabled';
};

export type AiAgentModelCall = {
  agentId?: string | null;
  engineId?: string | null;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costAmount: number;
  currency: string;
};

export type AiAgentGenerateTextResult = {
  content: string;
  modelCall: AiAgentModelCall;
};

export type AiAgentStreamDeltaHandler = (content: string) => void | Promise<void>;

export class AiAgentRuntimeError extends Error {
  constructor(
    public readonly code:
      | 'CONFIGURATION_UNAVAILABLE'
      | 'REQUEST_FAILED'
      | 'INVALID_RESPONSE'
      | 'SENSITIVE_WORD_MATCH',
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

type ChatCompletionRequestMessage = {
  role: 'system' | 'user';
  content: string | ChatCompletionRequestContentPart[];
};

type ChatCompletionRequestContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
      };
    };

type AiAgentRuntimeInput = {
  message: string;
  images?: AiAgentRuntimeImageInput[];
};

export type AiAgentRuntimeImageInput = {
  data?: string;
  mimeType: string;
  name?: string;
  url?: string;
};

type ChatCompletionResponseShape = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
    text?: unknown;
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
};

type ChatCompletionStreamChunkShape = {
  choices?: Array<{
    delta?: {
      content?: unknown;
    };
    message?: {
      content?: unknown;
    };
    text?: unknown;
  }>;
  usage?: ChatCompletionResponseShape['usage'];
};

export async function generateTextWithAgentRuntime(
  config: AiAgentRuntimeConfig,
  input: AiAgentRuntimeInput
): Promise<AiAgentGenerateTextResult> {
  ensureRuntimeConfigEnabled(config);
  ensureNoSensitiveWords(input.message, config.sensitiveWordList?.words ?? []);

  const modelName = config.engine.modelName?.trim() || config.engine.name.trim();
  const apiKey = decryptEngineApiKey(config.engine.apiKeyCiphertext).trim();

  if (!modelName || !apiKey) {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent model configuration is incomplete'
    );
  }

  const messages = createMessages(config.prompt?.content.trim(), input.message, input.images);
  const startedAt = Date.now();
  const response = await globalThis.fetch(toChatCompletionsUrl(config.engine.apiBaseUrl), {
    body: JSON.stringify({
      max_tokens: config.agent.maxTokens,
      messages,
      model: modelName,
      temperature: config.agent.temperature,
      top_p: config.agent.topP,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const rawBody = await response.text();

  if (!response.ok) {
    throw new AiAgentRuntimeError(
      'REQUEST_FAILED',
      `AI model request failed with status ${response.status}`,
      response.status
    );
  }

  const parsed = parseJsonResponse(rawBody);
  const content = readAssistantContent(parsed);
  const usage = readUsage(parsed, messages, content);

  return {
    content,
    modelCall: {
      agentId: config.agent.id,
      engineId: config.engine.id,
      modelName,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      costAmount: 0,
      currency: 'CNY',
    },
  };
}

export async function generateTextWithEngineRuntime(
  engine: AiEngineRuntimeConfig,
  input: AiAgentRuntimeInput,
  options: {
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
  } = {}
): Promise<AiAgentGenerateTextResult> {
  ensureEngineConfigEnabled(engine);

  const modelName = engine.modelName?.trim() || engine.name.trim();
  const apiKey = decryptEngineApiKey(engine.apiKeyCiphertext).trim();

  if (!modelName || !apiKey) {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent model configuration is incomplete'
    );
  }

  const messages = createMessages(options.systemPrompt?.trim(), input.message, input.images);
  const startedAt = Date.now();
  const response = await globalThis.fetch(toChatCompletionsUrl(engine.apiBaseUrl), {
    body: JSON.stringify({
      max_tokens: options.maxTokens ?? 1200,
      messages,
      model: modelName,
      temperature: options.temperature ?? 0.1,
      top_p: options.topP ?? 0.9,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const rawBody = await response.text();

  if (!response.ok) {
    throw new AiAgentRuntimeError(
      'REQUEST_FAILED',
      `AI model request failed with status ${response.status}`,
      response.status
    );
  }

  const parsed = parseJsonResponse(rawBody);
  const content = readAssistantContent(parsed);
  const usage = readUsage(parsed, messages, content);

  return {
    content,
    modelCall: {
      agentId: null,
      engineId: engine.id,
      modelName,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      costAmount: 0,
      currency: 'CNY',
    },
  };
}

export async function streamTextWithAgentRuntime(
  config: AiAgentRuntimeConfig,
  input: AiAgentRuntimeInput,
  onDelta: AiAgentStreamDeltaHandler
): Promise<AiAgentGenerateTextResult> {
  ensureRuntimeConfigEnabled(config);
  ensureNoSensitiveWords(input.message, config.sensitiveWordList?.words ?? []);

  const modelName = config.engine.modelName?.trim() || config.engine.name.trim();
  const apiKey = decryptEngineApiKey(config.engine.apiKeyCiphertext).trim();

  if (!modelName || !apiKey) {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent model configuration is incomplete'
    );
  }

  const messages = createMessages(config.prompt?.content.trim(), input.message, input.images);
  const startedAt = Date.now();
  const response = await globalThis.fetch(toChatCompletionsUrl(config.engine.apiBaseUrl), {
    body: JSON.stringify({
      max_tokens: config.agent.maxTokens,
      messages,
      model: modelName,
      stream: true,
      temperature: config.agent.temperature,
      top_p: config.agent.topP,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new AiAgentRuntimeError(
      'REQUEST_FAILED',
      `AI model request failed with status ${response.status}`,
      response.status
    );
  }

  if (!response.body) {
    throw new AiAgentRuntimeError('INVALID_RESPONSE', 'AI model response stream is empty');
  }

  const { content, usage } = await readChatCompletionStream(response.body, onDelta);
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AiAgentRuntimeError('INVALID_RESPONSE', 'AI model response is empty');
  }

  const resolvedUsage = readUsage(usage === undefined ? {} : { usage }, messages, trimmed);

  return {
    content: trimmed,
    modelCall: {
      agentId: config.agent.id,
      engineId: config.engine.id,
      modelName,
      promptTokens: resolvedUsage.promptTokens,
      completionTokens: resolvedUsage.completionTokens,
      totalTokens: resolvedUsage.totalTokens,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      costAmount: 0,
      currency: 'CNY',
    },
  };
}

export function estimateTextTokens(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function ensureRuntimeConfigEnabled(config: AiAgentRuntimeConfig): void {
  if (config.agent.status !== 'enabled' || config.engine.status !== 'enabled') {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent configuration is disabled'
    );
  }
}

function ensureEngineConfigEnabled(engine: AiEngineRuntimeConfig): void {
  if (engine.status !== 'enabled') {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent configuration is disabled'
    );
  }
}

function ensureNoSensitiveWords(message: string, words: string[]): void {
  const normalizedMessage = message.toLowerCase();
  const matchedWord = words
    .map((word) => word.trim())
    .filter(Boolean)
    .find((word) => normalizedMessage.includes(word.toLowerCase()));

  if (matchedWord) {
    throw new AiAgentRuntimeError('SENSITIVE_WORD_MATCH', 'AI request contains sensitive content');
  }
}

function createMessages(
  systemPrompt: string | undefined,
  userMessage: string,
  images?: AiAgentRuntimeImageInput[]
): ChatCompletionRequestMessage[] {
  const messages: ChatCompletionRequestMessage[] = [];
  const normalizedImages = normalizeRuntimeImages(images);
  const text = userMessage.trim();

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  if (normalizedImages.length > 0) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text },
        ...normalizedImages.map((image) => ({
          type: 'image_url' as const,
          image_url: {
            url: toImageDataUrl(image),
          },
        })),
      ],
    });
  } else {
    messages.push({ role: 'user', content: text });
  }

  return messages;
}

function normalizeRuntimeImages(
  images: AiAgentRuntimeImageInput[] | undefined
): AiAgentRuntimeImageInput[] {
  return (images ?? [])
    .map((image) => {
      const name = image.name?.trim();
      const data = image.data?.trim();
      const url = image.url?.trim();

      return {
        ...(data ? { data } : {}),
        mimeType: image.mimeType.trim(),
        ...(name ? { name } : {}),
        ...(url ? { url } : {}),
      };
    })
    .filter((image) => (image.data || image.url) && image.mimeType.startsWith('image/'));
}

function toImageDataUrl(image: AiAgentRuntimeImageInput): string {
  if (image.url?.trim()) {
    return image.url.trim();
  }

  const data = image.data?.trim() ?? '';

  if (data.startsWith('data:')) {
    return data;
  }

  return `data:${image.mimeType};base64,${data}`;
}

function toChatCompletionsUrl(apiBaseUrl: string): string {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, '');

  if (!normalized) {
    throw new AiAgentRuntimeError(
      'CONFIGURATION_UNAVAILABLE',
      'AI agent model configuration is incomplete'
    );
  }

  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function parseJsonResponse(rawBody: string): ChatCompletionResponseShape {
  try {
    return JSON.parse(rawBody) as ChatCompletionResponseShape;
  } catch {
    throw new AiAgentRuntimeError('INVALID_RESPONSE', 'AI model response is not valid JSON');
  }
}

async function readChatCompletionStream(
  body: ReadableStream<Uint8Array>,
  onDelta: AiAgentStreamDeltaHandler
): Promise<{ content: string; usage?: ChatCompletionResponseShape['usage'] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage: ChatCompletionResponseShape['usage'] | undefined;

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const parsed = readServerSentEventData(buffer);

      buffer = parsed.remaining;

      for (const rawData of parsed.data) {
        if (rawData === '[DONE]') {
          continue;
        }

        const chunk = parseStreamChunk(rawData);
        const delta = readStreamDelta(chunk);

        if (delta) {
          content += delta;
          await onDelta(delta);
        }

        if (chunk.usage) {
          usage = chunk.usage;
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
      if (rawData === '[DONE]') {
        continue;
      }

      const chunk = parseStreamChunk(rawData);
      const delta = readStreamDelta(chunk);

      if (delta) {
        content += delta;
        await onDelta(delta);
      }

      if (chunk.usage) {
        usage = chunk.usage;
      }
    }
  }

  return usage === undefined ? { content } : { content, usage };
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

function parseStreamChunk(rawData: string): ChatCompletionStreamChunkShape {
  try {
    return JSON.parse(rawData) as ChatCompletionStreamChunkShape;
  } catch {
    throw new AiAgentRuntimeError('INVALID_RESPONSE', 'AI model stream response is not valid JSON');
  }
}

function readStreamDelta(chunk: ChatCompletionStreamChunkShape): string {
  const firstChoice = chunk.choices?.[0];
  const delta =
    typeof firstChoice?.delta?.content === 'string'
      ? firstChoice.delta.content
      : typeof firstChoice?.message?.content === 'string'
        ? firstChoice.message.content
        : typeof firstChoice?.text === 'string'
          ? firstChoice.text
          : '';

  return delta;
}

function readAssistantContent(response: ChatCompletionResponseShape): string {
  const firstChoice = response.choices?.[0];
  const content =
    typeof firstChoice?.message?.content === 'string'
      ? firstChoice.message.content
      : typeof firstChoice?.text === 'string'
        ? firstChoice.text
        : '';
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AiAgentRuntimeError('INVALID_RESPONSE', 'AI model response is empty');
  }

  return trimmed;
}

function readUsage(
  response: ChatCompletionResponseShape,
  messages: ChatCompletionRequestMessage[],
  content: string
): { promptTokens: number; completionTokens: number; totalTokens: number } {
  const fallbackPromptTokens = estimateTextTokens(
    messages.map((message) => contentToTokenEstimateText(message.content)).join('\n')
  );
  const fallbackCompletionTokens = estimateTextTokens(content);
  const promptTokens = readPositiveNumber(response.usage?.prompt_tokens) ?? fallbackPromptTokens;
  const completionTokens =
    readPositiveNumber(response.usage?.completion_tokens) ?? fallbackCompletionTokens;
  const totalTokens =
    readPositiveNumber(response.usage?.total_tokens) ?? promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

function contentToTokenEstimateText(content: ChatCompletionRequestMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => (part.type === 'text' ? part.text : '[image]'))
    .filter(Boolean)
    .join('\n');
}

function readPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.ceil(value);
}
