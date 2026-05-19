import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ConversationCategory, MessageRole } from '@package/db/schema';

import type { AiRepository } from './ai.repository.js';
import { AiService, AiServiceError } from './ai.service.js';

type ConversationRow = {
  id: string;
  userId: string;
  category: ConversationCategory;
  title: string;
  metadata: Record<string, unknown> | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRow = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  payload: Record<string, unknown> | unknown[] | null;
  suggestions: string[] | null;
  workflowName: string | null;
  redirectTo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

test('sendChat creates a conversation when sessionId is absent', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  const result = await service.sendChat({
    userId: 'user-1',
    message: 'How should I start?',
  });

  assert.equal(repository.conversations.length, 1);
  assert.equal(result.sessionId, repository.conversations[0]?.id);
  assert.equal(repository.messages.length, 2);
  assert.deepEqual(result.events[0], {
    type: 'session',
    sessionId: repository.conversations[0]?.id,
  });
});

test('listHistory returns only chat conversations for the chat filter', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  repository.addConversation({ id: 'chat-session', userId: 'user-1', category: 'chat' });
  repository.addConversation({
    id: 'inspiration-session',
    userId: 'user-1',
    category: 'inspiration',
  });

  const result = await service.listHistory({ userId: 'user-1', category: 'chat' });

  assert.deepEqual(
    result.items.map((item) => item.sessionId),
    ['chat-session']
  );
  assert.equal(result.items[0]?.category, 'chat');
});

test('sendChat returns workflow events with the documented routes', async () => {
  const cases: Array<[ConversationCategory, string]> = [
    ['comment', '/office/comment'],
    ['inspiration', '/lesson/inspiration'],
    ['teaching', '/office/teaching'],
  ];

  for (const [category, redirectTo] of cases) {
    const repository = new FakeAiRepository();
    const service = new AiService(repository.asRepository());

    const result = await service.sendChat({
      userId: 'user-1',
      category,
      message: 'Open the workflow',
    });
    const workflowEvent = result.events.find((event) => event.type === 'workflow');

    assert.deepEqual(workflowEvent, {
      type: 'workflow',
      workflowName: category,
      redirectTo,
    });
  }
});

test('sendChat fails before writing mock content in production without provider config', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProvider = process.env.AI_PROVIDER;
  const originalMockEnabled = process.env.AI_MOCK_ENABLED;
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MOCK_ENABLED;

    await assert.rejects(
      () =>
        service.sendChat({
          userId: 'user-1',
          message: 'Should not persist',
        }),
      /AI provider is not configured/
    );
    assert.equal(repository.conversations.length, 0);
    assert.equal(repository.messages.length, 0);
  } finally {
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('AI_PROVIDER', originalProvider);
    restoreEnv('AI_MOCK_ENABLED', originalMockEnabled);
  }
});

test('generateInspiration rejects an empty topic before persistence', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateInspiration({
        userId: 'user-1',
        grade: '三年级',
        subject: '语文',
        topic: '   ',
      }),
    (error) => {
      assert.equal(error instanceof AiServiceError, true);
      assert.equal((error as AiServiceError).code, 'BAD_REQUEST');
      assert.equal((error as AiServiceError).message, 'Inspiration topic is required');

      return true;
    }
  );
  assert.equal(repository.conversations.length, 0);
  assert.equal(repository.messages.length, 0);
});

test('generateInspiration stores structured fields and returns credit and assistant events', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  const result = await service.generateInspiration({
    userId: 'user-1',
    grade: ' 三年级 ',
    subject: ' 语文 ',
    topic: ' 春天 ',
    context: ' 结合校园观察 ',
  });

  assert.equal(repository.conversations[0]?.category, 'inspiration');
  assert.equal(repository.messages[0]?.role, 'user');
  assert.equal(repository.messages[0]?.content, '请为我精讲 春天（三年级 语文），结合校园观察');
  assert.deepEqual(repository.messages[0]?.payload, {
    grade: '三年级',
    subject: '语文',
    topic: '春天',
    context: '结合校园观察',
  });
  assert.equal(repository.messages[1]?.role, 'assistant');
  assert.match(repository.messages[1]?.content ?? '', /^\[mock:inspiration\]/);
  assert.equal(
    result.events.some((event) => event.type === 'credit'),
    true
  );
  assert.equal(
    result.events.some((event) => event.type === 'delta'),
    true
  );
  assert.equal(
    result.events.some((event) => event.type === 'done'),
    true
  );
});

test('followUpInspiration requires sessionId before persistence', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());

  await assert.rejects(
    () =>
      service.followUpInspiration({
        userId: 'user-1',
        sessionId: '   ',
        message: '继续',
      }),
    (error) => {
      assert.equal(error instanceof AiServiceError, true);
      assert.equal((error as AiServiceError).code, 'BAD_REQUEST');
      assert.equal((error as AiServiceError).message, 'Inspiration sessionId is required');

      return true;
    }
  );
  assert.equal(repository.conversations.length, 0);
  assert.equal(repository.messages.length, 0);
});

test('followUpInspiration appends to an inspiration conversation', async () => {
  const repository = new FakeAiRepository();
  const service = new AiService(repository.asRepository());
  repository.addConversation({
    id: 'inspiration-session',
    userId: 'user-1',
    category: 'inspiration',
  });

  const result = await service.followUpInspiration({
    userId: 'user-1',
    sessionId: ' inspiration-session ',
    message: ' 继续扩展活动 ',
  });

  assert.equal(result.sessionId, 'inspiration-session');
  assert.equal(repository.conversations.length, 1);
  assert.equal(repository.messages[0]?.content, '继续扩展活动');
  assert.equal(
    result.events.some((event) => event.type === 'credit'),
    true
  );
});

class FakeAiRepository {
  readonly conversations: ConversationRow[] = [];
  readonly messages: MessageRow[] = [];

  private conversationCounter = 0;
  private messageCounter = 0;

  asRepository(): AiRepository {
    return this as unknown as AiRepository;
  }

  addConversation(input: {
    id: string;
    userId: string;
    category: ConversationCategory;
    title?: string;
  }): ConversationRow {
    const now = new Date('2026-05-19T00:00:00.000Z');
    const conversation: ConversationRow = {
      id: input.id,
      userId: input.userId,
      category: input.category,
      title: input.title ?? input.id,
      metadata: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.push(conversation);

    return conversation;
  }

  async createConversation(input: {
    userId: string;
    category: ConversationCategory;
    title: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<ConversationRow> {
    this.conversationCounter += 1;

    return this.addConversation({
      id: `session-${this.conversationCounter}`,
      userId: input.userId,
      category: input.category,
      title: input.title,
    });
  }

  async findConversationForUser(
    userId: string,
    conversationId: string
  ): Promise<ConversationRow | null> {
    return (
      this.conversations.find(
        (conversation) =>
          conversation.userId === userId &&
          conversation.id === conversationId &&
          !conversation.isDeleted
      ) ?? null
    );
  }

  async listConversations(input: {
    userId: string;
    category?: ConversationCategory;
    limit: number;
  }): Promise<ConversationRow[]> {
    return this.conversations
      .filter(
        (conversation) =>
          conversation.userId === input.userId &&
          !conversation.isDeleted &&
          (!input.category || conversation.category === input.category)
      )
      .slice(0, input.limit);
  }

  async appendMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    payload?: Record<string, unknown> | unknown[] | null;
    suggestions?: string[] | null;
    workflowName?: string | null;
    redirectTo?: string | null;
  }): Promise<MessageRow> {
    this.messageCounter += 1;

    const now = new Date('2026-05-19T00:00:00.000Z');
    const message: MessageRow = {
      id: `message-${this.messageCounter}`,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      payload: input.payload ?? null,
      suggestions: input.suggestions ?? null,
      workflowName: input.workflowName ?? null,
      redirectTo: input.redirectTo ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.messages.push(message);

    return message;
  }

  async saveChatExchange(input: {
    conversation?: ConversationRow;
    createConversation?: {
      userId: string;
      category: ConversationCategory;
      title: string;
      metadata?: Record<string, unknown> | null;
    };
    userMessage: {
      content: string;
      payload?: Record<string, unknown> | unknown[] | null;
    };
    assistantMessage: {
      content: string;
      suggestions?: string[] | null;
      workflowName?: string | null;
      redirectTo?: string | null;
    };
  }): Promise<{
    conversation: ConversationRow;
    userMessage: MessageRow;
    assistantMessage: MessageRow;
  }> {
    const conversation =
      input.conversation ??
      (await this.createConversation({
        userId: input.createConversation?.userId ?? 'user-1',
        category: input.createConversation?.category ?? 'chat',
        title: input.createConversation?.title ?? 'New conversation',
        metadata: input.createConversation?.metadata ?? null,
      }));
    const userMessage = await this.appendMessage({
      conversationId: conversation.id,
      role: 'user',
      content: input.userMessage.content,
      payload: input.userMessage.payload ?? null,
    });
    const assistantMessage = await this.appendMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: input.assistantMessage.content,
      suggestions: input.assistantMessage.suggestions ?? null,
      workflowName: input.assistantMessage.workflowName ?? null,
      redirectTo: input.assistantMessage.redirectTo ?? null,
    });

    return {
      conversation,
      userMessage,
      assistantMessage,
    };
  }

  async listMessagesForConversations(conversationIds: string[]): Promise<MessageRow[]> {
    return this.messages.filter((message) => conversationIds.includes(message.conversationId));
  }

  async softDeleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const conversation = this.conversations.find(
      (item) => item.userId === userId && item.id === conversationId && !item.isDeleted
    );

    if (!conversation) {
      return false;
    }

    conversation.isDeleted = true;

    return true;
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
