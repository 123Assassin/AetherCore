import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AdminOperationsService,
  type AdminOperationsAuditContext,
} from './admin-operations.service.js';
import type {
  AiMessageRow,
  AiModelCallRow,
  AdminOperationsRepository,
  AdminOperationsUserRow,
  ContentAuditSessionRow,
  CreditTransactionRow,
  LastLoginRow,
  SessionRow,
  SystemAuditLogSaveData,
  TrafficStatsRow,
  UserConversationRow,
  UserCreditAccountRow,
} from './admin-operations.repository.js';

const now = new Date('2026-05-20T00:00:00.000Z');
const actor = {
  actorId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'node-test',
} satisfies AdminOperationsAuditContext;

test('user status and blacklist mutate independently', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const disabled = await service.updateUserStatus({ id: 'user-1', status: 'disabled' }, actor);

  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.isBlacklisted, false);

  const blacklisted = await service.updateUserBlacklist(
    { id: 'user-1', isBlacklisted: true },
    actor
  );

  assert.equal(blacklisted.status, 'disabled');
  assert.equal(blacklisted.isBlacklisted, true);
  assert.equal(repository.users[0]?.isActive, false);
  assert.equal(repository.users[0]?.isBlacklisted, true);
});

test('content audit delete sets soft-delete marker', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const deleted = await service.deleteContentAuditSession({ id: 'content-1' }, actor);

  assert.equal(deleted.id, 'content-1');
  assert.equal(deleted.isDeleted, true);
  assert.equal(repository.contentAuditSessions[0]?.isDeleted, true);
});

test('high-risk mutations write system audit log', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  await service.updateUserBlacklist({ id: 'user-1', isBlacklisted: true }, actor);
  await service.deleteContentAuditSession({ id: 'content-1' }, actor);

  assert.deepEqual(
    repository.auditLogs.map((log) => [log.action, log.resourceType, log.resourceId]),
    [
      ['admin.user.blacklist.update', 'user', 'user-1'],
      ['admin.contentAudit.delete', 'content_audit_session', 'content-1'],
    ]
  );
  assert.equal(repository.auditLogs[0]?.actorType, 'admin');
  assert.equal(repository.auditLogs[0]?.actorId, actor.actorId);
  assert.equal(repository.auditLogs[0]?.ip, actor.ip);
  assert.equal(repository.auditLogs[0]?.userAgent, actor.userAgent);
});

test('content audit delete maps a concurrent soft delete to conflict', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.markContentAuditDeletedDuringSoftDelete = true;

  await assert.rejects(
    () => service.deleteContentAuditSession({ id: 'content-1' }, actor),
    (error) =>
      error instanceof Error &&
      'domainCode' in error &&
      error.domainCode === 'RESOURCE_ALREADY_DELETED'
  );
});

test('admin mutation remains successful when best-effort audit write fails', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.failAuditWrites = true;

  const blacklisted = await service.updateUserBlacklist(
    { id: 'user-1', isBlacklisted: true },
    actor
  );

  assert.equal(blacklisted.isBlacklisted, true);
  assert.equal(repository.users[0]?.isBlacklisted, true);
});

test('user list exposes documented status quota and last login fields', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());
  repository.users.push({
    ...repository.users[0]!,
    id: 'deleted-user',
    email: 'deleted@example.com',
    isActive: false,
    deletedAt: now,
  });

  const result = await service.listUsers({ status: 'deleted' });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'deleted-user');
  assert.equal(result.items[0]?.status, 'deleted');
  assert.equal(result.items[0]?.credits, 25);
  assert.equal(result.items[0]?.totalQuota, 50);
  assert.equal(result.items[0]?.lastLoginAt, now.toISOString());
});

test('invite user accepts totalQuota and stores a hashed placeholder password', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const invited = await service.inviteUser(
    { email: 'invitee@example.com', name: 'Invitee', totalQuota: 200 },
    actor
  );

  assert.equal(repository.lastInvitedUserInput?.totalQuota, 200);
  assert.equal(repository.lastInvitedUserInput?.password.startsWith('invited:'), false);
  assert.equal(invited.credits, 200);
  assert.equal(invited.totalQuota, 200);
});

test('user activity combines login ai credit and conversation activity', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const result = await service.listUserActivity({ userId: 'user-1' });

  assert.deepEqual(result.items.map((item) => item.type).sort(), [
    'ai_call',
    'conversation',
    'credit',
    'login',
  ]);
});

test('content audit supports user filtering and returns messages for detail', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const filtered = await service.listContentAuditSessions({ userId: 'missing-user' });
  const detail = await service.getContentAuditSession({ id: 'content-1' });

  assert.equal(filtered.total, 0);
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[0]?.role, 'user');
  assert.equal(detail.messages[1]?.role, 'assistant');
});

test('traffic stats use documented engine metrics contract', async () => {
  const repository = new FakeAdminOperationsRepository();
  const service = new AdminOperationsService(repository.asRepository());

  const [item] = await service.listTrafficStats();

  assert.equal(item?.engine, 'Mock AI');
  assert.equal(item?.tokensTotal, 120);
  assert.equal(item?.avgResponseMs, 80);
  assert.equal(item?.successRate, 0.75);
  assert.equal(item?.costAmount, 1.25);
});

class FakeAdminOperationsRepository {
  readonly auditLogs: SystemAuditLogSaveData[] = [];
  failAuditWrites = false;
  markContentAuditDeletedDuringSoftDelete = false;
  lastInvitedUserInput: {
    email: string;
    name: string | null;
    password: string;
    totalQuota: number;
  } | null = null;

  readonly users: AdminOperationsUserRow[] = [
    {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hash',
      role: 'user',
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  readonly contentAuditSessions: ContentAuditSessionRow[] = [
    {
      id: 'content-1',
      conversationId: 'conversation-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      category: 'chat',
      title: 'Conversation',
      messageCount: 2,
      lastMessageAt: now,
      metadata: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly creditAccounts: UserCreditAccountRow[] = [
    {
      userId: 'user-1',
      balance: 10,
      cycleLimit: 100,
      cycleDays: 180,
      resetAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'deleted-user',
      balance: 25,
      cycleLimit: 50,
      cycleDays: 180,
      resetAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly sessions: SessionRow[] = [
    {
      id: 'session-1',
      userId: 'user-1',
      token: 'token-1',
      userAgent: 'node-test',
      ip: '127.0.0.1',
      expiresAt: new Date('2026-05-21T00:00:00.000Z'),
      createdAt: now,
    },
    {
      id: 'session-deleted',
      userId: 'deleted-user',
      token: 'token-deleted',
      userAgent: 'node-test',
      ip: '127.0.0.2',
      expiresAt: new Date('2026-05-21T00:00:00.000Z'),
      createdAt: now,
    },
  ];

  readonly modelCalls: AiModelCallRow[] = [
    {
      id: 'call-1',
      conversationId: 'conversation-1',
      messageId: 'message-2',
      userId: 'user-1',
      agentId: null,
      engineId: null,
      modelName: 'Mock AI',
      promptTokens: 40,
      completionTokens: 80,
      totalTokens: 120,
      latencyMs: 80,
      costAmount: 1.25,
      currency: 'CNY',
      status: 'success',
      errorCode: null,
      errorMessage: null,
      createdAt: now,
    },
  ];

  readonly creditTransactions: CreditTransactionRow[] = [
    {
      id: 'credit-1',
      userId: 'user-1',
      direction: 'out',
      amount: 1,
      reason: 'chat',
      idempotencyKey: null,
      relatedType: 'ai_conversation',
      relatedId: 'conversation-1',
      balanceAfter: 9,
      createdByAdminId: null,
      createdAt: now,
    },
  ];

  readonly conversations: UserConversationRow[] = [
    {
      id: 'conversation-1',
      userId: 'user-1',
      category: 'chat',
      title: 'Conversation',
      metadata: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly messages: AiMessageRow[] = [
    {
      id: 'message-1',
      messageOrder: 1n,
      conversationId: 'conversation-1',
      role: 'user',
      content: 'hello',
      payload: null,
      suggestions: null,
      workflowName: null,
      redirectTo: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'message-2',
      messageOrder: 2n,
      conversationId: 'conversation-1',
      role: 'assistant',
      content: 'hi',
      payload: null,
      suggestions: null,
      workflowName: null,
      redirectTo: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  readonly trafficStats: TrafficStatsRow[] = [
    {
      engineId: null,
      engine: 'Mock AI',
      currency: 'CNY',
      totalCalls: 4,
      successCalls: 3,
      failedCalls: 1,
      tokensTotal: 120,
      avgResponseMs: 80,
      costAmount: 1.25,
    },
  ];

  asRepository(): AdminOperationsRepository {
    return this as unknown as AdminOperationsRepository;
  }

  async listUsers(input: { includeDeleted?: boolean } = {}): Promise<AdminOperationsUserRow[]> {
    return input.includeDeleted ? this.users : this.users.filter((item) => !item.deletedAt);
  }

  async listUserCreditAccounts(userIds: string[]): Promise<UserCreditAccountRow[]> {
    return this.creditAccounts.filter((item) => userIds.includes(item.userId));
  }

  async listLastLogins(userIds: string[]): Promise<LastLoginRow[]> {
    return this.sessions
      .filter((item) => userIds.includes(item.userId))
      .map((item) => ({ userId: item.userId, lastLoginAt: item.createdAt }));
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminOperationsUserRow | null> {
    const user = this.users.find((item) => item.id === id && !item.deletedAt);

    if (!user) {
      return null;
    }

    user.isActive = isActive;
    user.updatedAt = now;

    return user;
  }

  async updateUserBlacklist(
    id: string,
    isBlacklisted: boolean
  ): Promise<AdminOperationsUserRow | null> {
    const user = this.users.find((item) => item.id === id && !item.deletedAt);

    if (!user) {
      return null;
    }

    user.isBlacklisted = isBlacklisted;
    user.updatedAt = now;

    return user;
  }

  async findUserByEmail(email: string): Promise<AdminOperationsUserRow | null> {
    return this.users.find((item) => item.email === email) ?? null;
  }

  async createInvitedUser(input: {
    email: string;
    name: string | null;
    password: string;
    totalQuota: number;
  }): Promise<AdminOperationsUserRow> {
    this.lastInvitedUserInput = input;
    const user: AdminOperationsUserRow = {
      id: 'invited-user',
      email: input.email,
      name: input.name,
      password: input.password,
      role: 'user',
      isActive: true,
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.push(user);

    return user;
  }

  async listUserSessions(userId: string): Promise<SessionRow[]> {
    return this.sessions.filter((item) => item.userId === userId);
  }

  async listUserModelCalls(userId: string): Promise<AiModelCallRow[]> {
    return this.modelCalls.filter((item) => item.userId === userId);
  }

  async listUserCreditTransactions(userId: string): Promise<CreditTransactionRow[]> {
    return this.creditTransactions.filter((item) => item.userId === userId);
  }

  async listUserConversations(userId: string): Promise<UserConversationRow[]> {
    return this.conversations.filter((item) => item.userId === userId);
  }

  async softDeleteContentAuditSession(id: string): Promise<ContentAuditSessionRow | null> {
    const session = this.contentAuditSessions.find((item) => item.id === id);

    if (!session) {
      return null;
    }
    if (this.markContentAuditDeletedDuringSoftDelete) {
      session.isDeleted = true;
      session.updatedAt = now;

      return null;
    }

    session.isDeleted = true;
    session.updatedAt = now;

    return session;
  }

  async findContentAuditSessionById(id: string): Promise<ContentAuditSessionRow | null> {
    return this.contentAuditSessions.find((item) => item.id === id) ?? null;
  }

  async listContentAuditSessions(): Promise<ContentAuditSessionRow[]> {
    return this.contentAuditSessions;
  }

  async listContentAuditMessages(conversationId: string): Promise<AiMessageRow[]> {
    return this.messages.filter((item) => item.conversationId === conversationId);
  }

  async listTrafficStats(): Promise<TrafficStatsRow[]> {
    return this.trafficStats;
  }

  async createSystemAuditLog(input: SystemAuditLogSaveData): Promise<void> {
    if (this.failAuditWrites) {
      throw new Error('audit failed');
    }

    this.auditLogs.push(input);
  }
}
