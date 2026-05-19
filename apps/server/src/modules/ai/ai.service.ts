import { Injectable } from '@nestjs/common';
import type { ConversationCategory } from '@package/db/schema';

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

const WORKFLOW_ROUTES: Record<AiWorkflowName, string> = {
  comment: '/office/comment',
  inspiration: '/lesson/inspiration',
  teaching: '/office/teaching',
};

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
    const content = input.message.trim();

    if (!content) {
      throw new AiServiceError('BAD_REQUEST', 'Message is required');
    }

    const existingConversation = input.sessionId
      ? await this.getExistingConversation(input.userId, input.sessionId, input.category)
      : null;
    const category = existingConversation?.category ?? input.category ?? DEFAULT_CATEGORY;

    ensureMockProviderEnabled();

    const assistantContent = createAssistantContent(category, content);
    const suggestions = createSuggestions(category);
    const workflow = getWorkflow(category);
    const exchange = await this.aiRepository.saveChatExchange({
      ...(existingConversation
        ? { conversation: existingConversation }
        : {
            createConversation: {
              userId: input.userId,
              category,
              title: createTitle(content),
            },
          }),
      userMessage: {
        content,
        payload: input.payload ?? null,
      },
      assistantMessage: {
        content: assistantContent,
        suggestions,
        workflowName: workflow?.workflowName ?? null,
        redirectTo: workflow?.redirectTo ?? null,
      },
    });

    return {
      sessionId: exchange.conversation.id,
      events: [
        { type: 'session', sessionId: exchange.conversation.id },
        { type: 'delta', content: assistantContent },
        { type: 'suggestions', suggestions },
        ...(workflow ? [{ type: 'workflow' as const, ...workflow }] : []),
        { type: 'credit', remaining: 999 },
        { type: 'done', messageId: exchange.assistantMessage.id },
      ],
    };
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
}

function createTitle(input: string): string {
  const title = input.trim().replace(/\s+/g, ' ');

  if (!title) {
    return 'New conversation';
  }

  return title.slice(0, MAX_TITLE_LENGTH);
}

function createAssistantContent(category: ConversationCategory, message: string): string {
  return `[mock:${category}] ${message}`;
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

function normalizeLimit(limit: number | undefined): number {
  if (!limit) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_HISTORY_LIMIT);
}
