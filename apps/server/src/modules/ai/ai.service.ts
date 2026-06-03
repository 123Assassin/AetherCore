import { Injectable } from '@nestjs/common';
import type { ConversationCategory } from '@package/db/schema';
import { normalizeAdminAgentGradeClassification, WEB_AGENT_MAPPING } from '@package/shared';

import {
  AiAgentRuntimeError,
  generateTextWithAgentRuntime,
  streamTextWithAgentRuntime,
  type AiAgentModelCall,
  type AiAgentRuntimeConfig,
} from './ai-agent-runtime.js';
import { AiRepository, type AiConversationRow, type AiMessageRow } from './ai.repository.js';

export type AiWorkflowName = 'comment' | 'inspiration' | 'teaching';

export type AiStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'delta'; content: string }
  | { type: 'suggestions'; suggestions: string[] }
  | { type: 'workflow'; workflowName: AiWorkflowName; redirectTo: string }
  | { type: 'credit'; remaining: number }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };

export type AiChatCreateInput = {
  userId: string;
  category?: ConversationCategory;
  title?: string;
  metadata?: Record<string, unknown> | null;
};

export type AiChatSendInput = {
  userId: string;
  sessionId?: string;
  category?: ConversationCategory;
  message: string;
  payload?: Record<string, unknown> | unknown[] | null;
};

export type AiHistoryListInput = {
  userId: string;
  category?: ConversationCategory;
  limit?: number;
};

export type AiHistoryDeleteInput = {
  userId: string;
  sessionId: string;
};

export type AiInspirationGenerateInput = {
  userId: string;
  sessionId?: string;
  grade: string;
  subject: string;
  topic: string;
  context?: string;
};

export type AiInspirationFollowUpInput = {
  userId: string;
  sessionId: string;
  message: string;
};

export type AiTeachingMode = 'variant' | 'knowledge';

export type AiTeachingVariantLevel = 'similar' | 'challenge' | 'creative';

export type AiTeachingKnowledgeLevel = 'foundation' | 'application' | 'expansion';

export type AiTeachingLevel = AiTeachingVariantLevel | AiTeachingKnowledgeLevel;

type AiTeachingGenerateBaseInput = {
  userId: string;
  sessionId?: string;
  subject: string;
  stage: string;
  prompt: string;
};

export type AiTeachingGenerateInput =
  | (AiTeachingGenerateBaseInput & {
      mode: 'variant';
      level: AiTeachingVariantLevel;
    })
  | (AiTeachingGenerateBaseInput & {
      mode: 'knowledge';
      level: AiTeachingKnowledgeLevel;
    });

export type AiTeachingFollowUpInput = {
  userId: string;
  sessionId: string;
  message: string;
};

export type AiChatCreateResult = {
  sessionId: string;
  category: ConversationCategory;
  title: string;
  createdAt: string;
};

export type AiChatSendResult = {
  sessionId: string;
  events: AiStreamEvent[];
};

export type AiStreamEventHandler = (event: AiStreamEvent) => void | Promise<void>;

export type AiHistoryItem = {
  sessionId: string;
  category: ConversationCategory;
  title: string;
  messages: AiHistoryMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AiHistoryMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestions: string[];
  workflowName: AiWorkflowName | null;
  redirectTo: string | null;
  createdAt: string;
};

export type AiHistoryListResult = {
  items: AiHistoryItem[];
};

export type AiHistoryDeleteResult = {
  success: true;
};

type AgentClassification = {
  grade: string | null;
  subject: string | null;
};

export class AiServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR',
    message: string
  ) {
    super(message);
  }
}

const DEFAULT_CATEGORY: ConversationCategory = 'chat';
const MAX_TITLE_LENGTH = 200;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
const TEACHING_MODES = ['variant', 'knowledge'] as const;
const TEACHING_VARIANT_LEVELS = ['similar', 'challenge', 'creative'] as const;
const TEACHING_KNOWLEDGE_LEVELS = ['foundation', 'application', 'expansion'] as const;

const WORKFLOW_ROUTES: Record<AiWorkflowName, string> = {
  comment: '/office/comment',
  inspiration: '/lesson/inspiration',
  teaching: '/office/teaching',
};
const AGENT_CLASSIFICATION_METADATA_KEY = 'agentClassification';

@Injectable()
export class AiService {
  constructor(private readonly aiRepository: AiRepository) {}

  async createChat(input: AiChatCreateInput): Promise<AiChatCreateResult> {
    const category = input.category ?? DEFAULT_CATEGORY;
    const conversation = await this.aiRepository.createConversation({
      userId: input.userId,
      category,
      title: createTitle(input.title ?? 'New conversation'),
      metadata: input.metadata ?? null,
    });

    return {
      sessionId: conversation.id,
      category: conversation.category,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  async sendChat(input: AiChatSendInput): Promise<AiChatSendResult> {
    const startedAt = Date.now();
    const content = input.message.trim();

    if (!content) {
      throw new AiServiceError('BAD_REQUEST', 'Message is required');
    }

    const existingConversation = input.sessionId
      ? await this.getExistingConversation(input.userId, input.sessionId, input.category)
      : null;
    const category = existingConversation?.category ?? input.category ?? DEFAULT_CATEGORY;
    const suggestions = createSuggestions(category);
    const workflow = getWorkflow(category);
    const agentKey = WEB_AGENT_MAPPING[category].adminAgentKey;
    const agentClassification = resolveAgentClassification(
      category,
      input.payload,
      existingConversation?.metadata
    );
    const runtimeConfig = await this.aiRepository.findAgentRuntimeConfigByKey(
      agentKey,
      agentClassification
    );
    const generated = runtimeConfig
      ? await this.generateWithAgentRuntime(runtimeConfig, content)
      : createMockGeneration(category, content, input.payload, startedAt);
    const exchange = await this.aiRepository.saveChatExchange({
      ...(existingConversation
        ? { conversation: existingConversation }
        : {
            createConversation: {
              userId: input.userId,
              category,
              title: createTitle(content),
              metadata: createConversationMetadata(category, agentClassification),
            },
          }),
      userMessage: {
        content,
        payload: input.payload ?? null,
      },
      assistantMessage: {
        content: generated.content,
        suggestions,
        workflowName: workflow?.workflowName ?? null,
        redirectTo: workflow?.redirectTo ?? null,
      },
      modelCall: generated.modelCall,
    });

    return {
      sessionId: exchange.conversation.id,
      events: [
        { type: 'session', sessionId: exchange.conversation.id },
        { type: 'delta', content: generated.content },
        { type: 'suggestions', suggestions },
        ...(workflow ? [{ type: 'workflow' as const, ...workflow }] : []),
        { type: 'credit', remaining: 999 },
        { type: 'done', messageId: exchange.assistantMessage.id },
      ],
    };
  }

  async sendChatStream(
    input: AiChatSendInput,
    onEvent: AiStreamEventHandler
  ): Promise<AiChatSendResult> {
    const startedAt = Date.now();
    const content = input.message.trim();

    if (!content) {
      throw new AiServiceError('BAD_REQUEST', 'Message is required');
    }

    const existingConversation = input.sessionId
      ? await this.getExistingConversation(input.userId, input.sessionId, input.category)
      : null;
    const category = existingConversation?.category ?? input.category ?? DEFAULT_CATEGORY;
    const suggestions = createSuggestions(category);
    const workflow = getWorkflow(category);
    const agentKey = WEB_AGENT_MAPPING[category].adminAgentKey;
    const agentClassification = resolveAgentClassification(
      category,
      input.payload,
      existingConversation?.metadata
    );
    const runtimeConfig = await this.aiRepository.findAgentRuntimeConfigByKey(
      agentKey,
      agentClassification
    );
    const events: AiStreamEvent[] = [];
    const emit = async (event: AiStreamEvent) => {
      events.push(event);
      await onEvent(event);
    };
    const generated = runtimeConfig
      ? await this.streamWithAgentRuntime(runtimeConfig, content, async (delta) => {
          await emit({ type: 'delta', content: delta });
        })
      : await this.streamMockGeneration(
          category,
          content,
          input.payload,
          startedAt,
          async (delta) => {
            await emit({ type: 'delta', content: delta });
          }
        );
    const exchange = await this.aiRepository.saveChatExchange({
      ...(existingConversation
        ? { conversation: existingConversation }
        : {
            createConversation: {
              userId: input.userId,
              category,
              title: createTitle(content),
              metadata: createConversationMetadata(category, agentClassification),
            },
          }),
      userMessage: {
        content,
        payload: input.payload ?? null,
      },
      assistantMessage: {
        content: generated.content,
        suggestions,
        workflowName: workflow?.workflowName ?? null,
        redirectTo: workflow?.redirectTo ?? null,
      },
      modelCall: generated.modelCall,
    });

    await emit({ type: 'session', sessionId: exchange.conversation.id });
    await emit({ type: 'suggestions', suggestions });

    if (workflow) {
      await emit({ type: 'workflow', ...workflow });
    }

    await emit({ type: 'credit', remaining: 999 });
    await emit({ type: 'done', messageId: exchange.assistantMessage.id });

    return {
      sessionId: exchange.conversation.id,
      events,
    };
  }

  async generateInspiration(input: AiInspirationGenerateInput): Promise<AiChatSendResult> {
    const grade = requireTrimmed(input.grade, 'Inspiration grade is required');
    const subject = requireTrimmed(input.subject, 'Inspiration subject is required');
    const topic = requireTrimmed(input.topic, 'Inspiration topic is required');
    const context = trimOptional(input.context);
    const sessionId = trimOptional(input.sessionId);

    return this.sendChat({
      userId: input.userId,
      ...(sessionId === undefined ? {} : { sessionId }),
      category: 'inspiration',
      message: createInspirationGenerateMessage({
        grade,
        subject,
        topic,
        ...(context === undefined ? {} : { context }),
      }),
      payload: {
        grade,
        subject,
        topic,
        ...(context === undefined ? {} : { context }),
      },
    });
  }

  async followUpInspiration(input: AiInspirationFollowUpInput): Promise<AiChatSendResult> {
    const sessionId = requireTrimmed(input.sessionId, 'Inspiration sessionId is required');
    const message = requireTrimmed(input.message, 'Inspiration message is required');

    return this.sendChat({
      userId: input.userId,
      sessionId,
      category: 'inspiration',
      message,
    });
  }

  async generateTeaching(input: AiTeachingGenerateInput): Promise<AiChatSendResult> {
    const subject = requireTrimmed(input.subject, 'Teaching subject is required');
    const stage = requireTrimmed(input.stage, 'Teaching stage is required');
    const mode = requireTeachingMode(input.mode);
    const prompt = requireTrimmed(input.prompt, 'Teaching prompt is required');
    const level = requireTeachingLevel(input.level, mode);
    const sessionId = trimOptional(input.sessionId);

    return this.sendChat({
      userId: input.userId,
      ...(sessionId === undefined ? {} : { sessionId }),
      category: 'teaching',
      message: createTeachingGenerateMessage({
        subject,
        stage,
        mode,
        prompt,
        level,
      }),
      payload: {
        subject,
        stage,
        mode,
        prompt,
        level,
      },
    });
  }

  async followUpTeaching(input: AiTeachingFollowUpInput): Promise<AiChatSendResult> {
    const sessionId = requireTrimmed(input.sessionId, 'Teaching sessionId is required');
    const message = requireTrimmed(input.message, 'Teaching message is required');
    const conversation = await this.getExistingConversation(input.userId, sessionId, 'teaching');
    const previousMessages = await this.aiRepository.listMessagesForConversations([
      conversation.id,
    ]);
    const context = createTeachingFollowUpContext(previousMessages);

    return this.sendChat({
      userId: input.userId,
      sessionId,
      category: 'teaching',
      message,
      payload: {
        kind: 'teaching-follow-up',
        message,
        previousAssistantContent: getPreviousAssistantContent(previousMessages),
        context,
      },
    });
  }

  async listHistory(input: AiHistoryListInput): Promise<AiHistoryListResult> {
    const limit = normalizeLimit(input.limit);
    const conversations = await this.aiRepository.listConversations({
      userId: input.userId,
      limit,
      ...(input.category === undefined ? {} : { category: input.category }),
    });
    const messagesByConversation = groupMessagesByConversation(
      await this.aiRepository.listMessagesForConversations(
        conversations.map((conversation) => conversation.id)
      )
    );

    return {
      items: conversations.map((conversation) => ({
        sessionId: conversation.id,
        category: conversation.category,
        title: conversation.title,
        messages: (messagesByConversation.get(conversation.id) ?? []).map(toHistoryMessage),
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      })),
    };
  }

  async deleteHistory(input: AiHistoryDeleteInput): Promise<AiHistoryDeleteResult> {
    const deleted = await this.aiRepository.softDeleteConversation(input.userId, input.sessionId);

    if (!deleted) {
      throw new AiServiceError('NOT_FOUND', 'AI conversation not found');
    }

    return { success: true };
  }

  private async getExistingConversation(
    userId: string,
    sessionId: string,
    category?: ConversationCategory
  ): Promise<AiConversationRow> {
    const conversation = await this.aiRepository.findConversationForUser(userId, sessionId);

    if (!conversation) {
      throw new AiServiceError('NOT_FOUND', 'AI conversation not found');
    }

    if (category && conversation.category !== category) {
      throw new AiServiceError('BAD_REQUEST', 'AI conversation category does not match');
    }

    return conversation;
  }

  private async generateWithAgentRuntime(
    runtimeConfig: AiAgentRuntimeConfig,
    content: string
  ): Promise<{ content: string; modelCall: AiAgentModelCall }> {
    try {
      return await generateTextWithAgentRuntime(runtimeConfig, { message: content });
    } catch (error) {
      if (error instanceof AiAgentRuntimeError) {
        if (error.code === 'SENSITIVE_WORD_MATCH') {
          throw new AiServiceError('BAD_REQUEST', error.message);
        }

        throw new AiServiceError('INTERNAL_SERVER_ERROR', error.message);
      }

      throw error;
    }
  }

  private async streamWithAgentRuntime(
    runtimeConfig: AiAgentRuntimeConfig,
    content: string,
    onDelta: (content: string) => void | Promise<void>
  ): Promise<{ content: string; modelCall: AiAgentModelCall }> {
    try {
      return await streamTextWithAgentRuntime(runtimeConfig, { message: content }, onDelta);
    } catch (error) {
      if (error instanceof AiAgentRuntimeError) {
        if (error.code === 'SENSITIVE_WORD_MATCH') {
          throw new AiServiceError('BAD_REQUEST', error.message);
        }

        throw new AiServiceError('INTERNAL_SERVER_ERROR', error.message);
      }

      throw error;
    }
  }

  private async streamMockGeneration(
    category: ConversationCategory,
    content: string,
    payload: Record<string, unknown> | unknown[] | null | undefined,
    startedAt: number,
    onDelta: (content: string) => void | Promise<void>
  ): Promise<{ content: string; modelCall: AiAgentModelCall }> {
    const generated = createMockGeneration(category, content, payload, startedAt);

    for (const delta of chunkStreamContent(generated.content)) {
      await onDelta(delta);
    }

    return generated;
  }
}

function createMockGeneration(
  category: ConversationCategory,
  content: string,
  payload: Record<string, unknown> | unknown[] | null | undefined,
  startedAt: number
): { content: string; modelCall: AiAgentModelCall } {
  ensureMockProviderEnabled();

  const assistantContent = createAssistantContent(category, content, payload);
  const promptTokens = estimateTokens(content);
  const completionTokens = estimateTokens(assistantContent);

  return {
    content: assistantContent,
    modelCall: {
      agentId: null,
      engineId: null,
      modelName: 'Mock AI',
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs: Math.max(Date.now() - startedAt, 0),
      costAmount: 0,
      currency: 'CNY',
    },
  };
}

function createTitle(input: string): string {
  const title = input.trim().replace(/\s+/g, ' ');

  if (!title) {
    return 'New conversation';
  }

  return title.slice(0, MAX_TITLE_LENGTH);
}

function createAssistantContent(
  category: ConversationCategory,
  message: string,
  payload?: Record<string, unknown> | unknown[] | null
): string {
  if (category === 'teaching') {
    const teachingContent = createTeachingAssistantContent(payload);

    if (teachingContent) {
      return teachingContent;
    }
  }

  return `[mock:${category}] ${message}`;
}

function createInspirationGenerateMessage(input: {
  grade: string;
  subject: string;
  topic: string;
  context?: string;
}): string {
  const base = `请为我精讲 ${input.topic}（${input.grade} ${input.subject}）`;

  return input.context ? `${base}，${input.context}` : base;
}

function createTeachingGenerateMessage(input: {
  subject: string;
  stage: string;
  mode: AiTeachingMode;
  prompt: string;
  level: AiTeachingLevel;
}): string {
  if (input.mode === 'variant') {
    return `教学出题（原题变式）：${input.stage} ${input.subject}，层级 ${input.level}。原题：${input.prompt}`;
  }

  return `教学出题（知识点出题）：${input.stage} ${input.subject}，层级 ${input.level}。知识点：${input.prompt}`;
}

function createTeachingAssistantContent(
  payload?: Record<string, unknown> | unknown[] | null
): string | null {
  if (isTeachingFollowUpPayload(payload)) {
    const previousAssistant = [...payload.context]
      .reverse()
      .find((message) => message.role === 'assistant');
    const previousContent =
      payload.previousAssistantContent ?? previousAssistant?.content ?? '无历史上下文';

    return `[mock:teaching] 追问回应：基于上一轮“${previousContent}”，回应“${payload.message}”。`;
  }

  if (!isTeachingPayload(payload)) {
    return null;
  }

  if (payload.mode === 'variant') {
    return `[mock:teaching] 原题变式设计：围绕“${payload.prompt}”生成 ${payload.level} 层级变式题，保留核心考点并调整条件或情境。`;
  }

  return `[mock:teaching] 知识点出题：围绕“${payload.prompt}”生成 ${payload.level} 层级原创题，包含清晰题干和可检查的作答目标。`;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AiServiceError('BAD_REQUEST', message);
  }

  return trimmed;
}

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function requireTeachingMode(value: string): AiTeachingMode {
  if (!TEACHING_MODES.includes(value as AiTeachingMode)) {
    throw new AiServiceError('BAD_REQUEST', 'Teaching mode is invalid');
  }

  return value as AiTeachingMode;
}

function requireTeachingLevel(value: string, mode: AiTeachingMode): AiTeachingLevel {
  if (mode === 'variant' && TEACHING_VARIANT_LEVELS.includes(value as AiTeachingVariantLevel)) {
    return value as AiTeachingVariantLevel;
  }

  if (
    mode === 'knowledge' &&
    TEACHING_KNOWLEDGE_LEVELS.includes(value as AiTeachingKnowledgeLevel)
  ) {
    return value as AiTeachingKnowledgeLevel;
  }

  throw new AiServiceError('BAD_REQUEST', 'Teaching level is invalid for mode');
}

function createTeachingFollowUpContext(
  messages: AiMessageRow[]
): Array<{ role: AiMessageRow['role']; content: string }> {
  return [...messages].sort(compareTeachingMessages).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function getPreviousAssistantContent(messages: AiMessageRow[]): string | null {
  return (
    [...messages]
      .filter((message) => message.role === 'assistant')
      .sort(compareTeachingMessages)
      .at(-1)?.content ?? null
  );
}

function compareTeachingMessages(first: AiMessageRow, second: AiMessageRow): number {
  if (first.messageOrder < second.messageOrder) {
    return -1;
  }

  if (first.messageOrder > second.messageOrder) {
    return 1;
  }

  const createdAtDiff = first.createdAt.getTime() - second.createdAt.getTime();

  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return 0;
}

function resolveAgentClassification(
  category: ConversationCategory,
  payload: Record<string, unknown> | unknown[] | null | undefined,
  metadata?: Record<string, unknown> | null
): AgentClassification {
  const payloadClassification = resolvePayloadAgentClassification(category, payload);

  if (hasAgentClassification(payloadClassification)) {
    return payloadClassification;
  }

  return readAgentClassificationMetadata(category, metadata) ?? payloadClassification;
}

function resolvePayloadAgentClassification(
  category: ConversationCategory,
  payload: Record<string, unknown> | unknown[] | null | undefined
): AgentClassification {
  if (!isRecord(payload)) {
    return { grade: null, subject: null };
  }

  const agentKey = WEB_AGENT_MAPPING[category].adminAgentKey;

  if (category === 'inspiration') {
    return {
      grade: normalizeAdminAgentGradeClassification(
        agentKey,
        readClassificationValue(payload.grade)
      ),
      subject: readClassificationValue(payload.subject),
    };
  }

  if (category === 'comment') {
    return {
      grade: normalizeAdminAgentGradeClassification(
        agentKey,
        readClassificationValue(payload.grade)
      ),
      subject: null,
    };
  }

  if (category === 'teaching') {
    return {
      grade: normalizeAdminAgentGradeClassification(
        agentKey,
        readClassificationValue(payload.grade) ?? readClassificationValue(payload.stage)
      ),
      subject: readClassificationValue(payload.subject),
    };
  }

  return { grade: null, subject: null };
}

function createConversationMetadata(
  category: ConversationCategory,
  classification: AgentClassification
): Record<string, unknown> | null {
  if (!hasAgentClassification(classification)) {
    return null;
  }

  return {
    [AGENT_CLASSIFICATION_METADATA_KEY]: {
      key: WEB_AGENT_MAPPING[category].adminAgentKey,
      grade: classification.grade,
      subject: classification.subject,
    },
  };
}

function readAgentClassificationMetadata(
  category: ConversationCategory,
  metadata: Record<string, unknown> | null | undefined
): AgentClassification | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const value = metadata[AGENT_CLASSIFICATION_METADATA_KEY];

  if (!isRecord(value) || value.key !== WEB_AGENT_MAPPING[category].adminAgentKey) {
    return null;
  }

  const classification = {
    grade: readClassificationValue(value.grade),
    subject: readClassificationValue(value.subject),
  };

  return hasAgentClassification(classification) ? classification : null;
}

function hasAgentClassification(classification: AgentClassification): boolean {
  return classification.grade !== null || classification.subject !== null;
}

function readClassificationValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function ensureMockProviderEnabled(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.AI_PROVIDER !== 'mock' &&
    process.env.AI_MOCK_ENABLED !== 'true'
  ) {
    throw new AiServiceError('INTERNAL_SERVER_ERROR', 'AI provider is not configured');
  }
}

function createSuggestions(category: ConversationCategory): string[] {
  if (category === 'chat') {
    return ['继续提问', '总结要点', '生成下一步'];
  }

  if (category === 'teaching') {
    return ['生成解析', '调整难度', '继续追问'];
  }

  return ['打开工作流', '补充材料', '调整要求'];
}

function getWorkflow(
  category: ConversationCategory
): { workflowName: AiWorkflowName; redirectTo: string } | null {
  if (category === 'chat') {
    return null;
  }

  return {
    workflowName: category as AiWorkflowName,
    redirectTo: WORKFLOW_ROUTES[category],
  };
}

function groupMessagesByConversation(messages: AiMessageRow[]): Map<string, AiMessageRow[]> {
  const grouped = new Map<string, AiMessageRow[]>();

  for (const message of messages) {
    const conversationMessages = grouped.get(message.conversationId);

    if (conversationMessages) {
      conversationMessages.push(message);
    } else {
      grouped.set(message.conversationId, [message]);
    }
  }

  return grouped;
}

function toHistoryMessage(message: AiMessageRow): AiHistoryMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    suggestions: message.suggestions ?? [],
    workflowName: isWorkflowName(message.workflowName) ? message.workflowName : null,
    redirectTo: message.redirectTo,
    createdAt: message.createdAt.toISOString(),
  };
}

function isWorkflowName(value: string | null): value is AiWorkflowName {
  return value === 'comment' || value === 'inspiration' || value === 'teaching';
}

function isTeachingPayload(value: unknown): value is {
  mode: AiTeachingMode;
  prompt: string;
  level: AiTeachingLevel;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    isTeachingMode((value as { mode?: unknown }).mode) &&
    typeof (value as { prompt?: unknown }).prompt === 'string' &&
    typeof (value as { level?: unknown }).level === 'string'
  );
}

function isTeachingFollowUpPayload(value: unknown): value is {
  kind: 'teaching-follow-up';
  message: string;
  previousAssistantContent: string | null;
  context: Array<{
    role: AiMessageRow['role'];
    content: string;
  }>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === 'teaching-follow-up' &&
    typeof (value as { message?: unknown }).message === 'string' &&
    ((value as { previousAssistantContent?: unknown }).previousAssistantContent === null ||
      typeof (value as { previousAssistantContent?: unknown }).previousAssistantContent ===
        'string') &&
    Array.isArray((value as { context?: unknown }).context) &&
    (value as { context: unknown[] }).context.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        typeof (item as { role?: unknown }).role === 'string' &&
        typeof (item as { content?: unknown }).content === 'string'
    )
  );
}

function isTeachingMode(value: unknown): value is AiTeachingMode {
  return typeof value === 'string' && TEACHING_MODES.includes(value as AiTeachingMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function chunkStreamContent(content: string): string[] {
  const chunkSize = 24;
  const chunks: string[] = [];

  for (let index = 0; index < content.length; index += chunkSize) {
    chunks.push(content.slice(index, index + chunkSize));
  }

  return chunks.length > 0 ? chunks : [content];
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_HISTORY_LIMIT);
}
