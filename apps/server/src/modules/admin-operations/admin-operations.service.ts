import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashPassword } from '@package/auth';

import {
  AdminOperationsRepository,
  type ActivityRow,
  type AlarmConfigRow,
  type AiMessageRow,
  type AiModelCallRow,
  type ContentAuditSessionRow,
  type CreditTransactionRow,
  type FissionRewardConfigRow,
  type SessionRow,
  type SystemAuthConfigRow,
  type SystemAuditLogRow,
  type AdminOperationsUserRow,
  type UserCreditAccountRow,
  type UserConversationRow,
} from './admin-operations.repository.js';

export type AdminOperationListInput = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type AdminOperationListResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserStatus = 'active' | 'disabled' | 'deleted';
export type AdminMutableUserStatus = Exclude<AdminUserStatus, 'deleted'>;

export type AdminUserItem = {
  id: string;
  email: string;
  name: string | null;
  displayName: string;
  role: string;
  status: AdminUserStatus;
  isBlacklisted: boolean;
  credits: number;
  totalQuota: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AdminUserListInput = AdminOperationListInput & {
  role?: string;
  status?: AdminUserStatus;
  isBlacklisted?: boolean;
};

export type AdminUserStatusInput = {
  id: string;
  status: AdminMutableUserStatus;
};

export type AdminUserBlacklistInput = {
  id: string;
  isBlacklisted: boolean;
};

export type AdminUserDeleteInput = {
  id: string;
};

export type AdminUserInviteInput = {
  email: string;
  name?: string | null;
  password?: string;
  totalQuota?: number;
  username?: string | null;
};

export type AdminCreateAdminUserInput = {
  email: string;
  name?: string | null;
  password: string;
  username: string;
};

export type AdminUserQuotaInput = {
  credits: number;
  id: string;
  totalQuota: number;
};

export type AdminUserActivityInput = {
  userId: string;
  page?: number;
  pageSize?: number;
};

export type AdminUserActivityType = 'login' | 'ai_call' | 'credit' | 'conversation';

export type AdminUserActivityItem = {
  id: string;
  type: AdminUserActivityType;
  title: string;
  description: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type AdminActivityStatus = 'draft' | 'published';

export type AdminActivityItem = {
  id: string;
  title: string;
  content: string;
  status: AdminActivityStatus;
  publishedAt: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminActivityListInput = AdminOperationListInput & {
  status?: AdminActivityStatus;
};

export type AdminActivityCreateInput = {
  title: string;
  content: string;
  status?: AdminActivityStatus;
};

export type AdminActivityUpdateInput = Partial<AdminActivityCreateInput> & {
  id: string;
};

export type AdminEntityIdInput = {
  id: string;
};

export type AdminInviteTreeNode = {
  id: string;
  email: string;
  name: string | null;
  inviteCode: string | null;
  totalInvited: number;
  rewardEarned: number;
  children: AdminInviteTreeNode[];
};

export type AdminFissionRewardConfig = {
  inviterQuota: number;
  inviteeQuota: number;
  enableMultiTier: boolean;
  tier2RewardPct: number;
  isActive: boolean;
  updatedByAdminId: string | null;
  updatedAt: string;
};

export type AdminFissionRewardConfigUpdateInput = {
  inviterQuota: number;
  inviteeQuota: number;
  enableMultiTier: boolean;
  tier2RewardPct: number;
  isActive: boolean;
};

export type AdminAlarmConfig = {
  threshold: number;
  currency: string;
  email: string;
  updatedByAdminId: string | null;
  updatedAt: string;
};

export type AdminAlarmConfigUpdateInput = {
  threshold: number;
  currency?: string;
  email: string;
};

export type AdminSystemConfig = {
  adminIdleTimeoutMinutes: number;
  auditLogRetentionDays: number;
  webIdleTimeoutMinutes: number;
  updatedByAdminId: string | null;
  updatedAt: string | null;
};

export type AdminSystemConfigUpdateInput = {
  adminIdleTimeoutMinutes?: number;
  auditLogRetentionDays?: number;
  webIdleTimeoutMinutes?: number;
};

export type AdminSystemAuditCleanupRangeInput = {
  endDate: string;
  startDate: string;
};

export type AdminSystemAuditCleanupResult = {
  cutoffTimestamp?: number;
  deletedCount: number;
  retentionDays?: number;
};

export type AdminAuditLevel = 0 | 1;

export type AdminAuditLogType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type AdminSystemAuditItem = {
  logId: string;
  timestamp: number;
  level: AdminAuditLevel;
  details: Record<string, unknown>;
  logType: AdminAuditLogType;
};

export type AdminSystemAuditListInput = AdminOperationListInput & {
  level?: AdminAuditLevel;
  logType?: AdminAuditLogType;
  startDate?: string;
  endDate?: string;
};

export type AdminAuditExportInput = {
  startDate?: string;
  endDate?: string;
};

export type AdminAuditExportResult = {
  filename: string;
  contentType: 'text/csv';
  content: string;
};

export type AdminContentAuditItem = {
  id: string;
  conversationId: string;
  userId: string | null;
  userEmail: string;
  category: 'chat' | 'inspiration' | 'comment' | 'teaching';
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  metadata: Record<string, unknown> | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminContentAuditMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type AdminContentAuditDetail = AdminContentAuditItem & {
  messages: AdminContentAuditMessage[];
};

export type AdminContentAuditListInput = AdminOperationListInput & {
  userId?: string;
  category?: AdminContentAuditItem['category'];
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
};

export type AdminTrafficStatsInput = {
  startDate?: string;
  endDate?: string;
};

export type AdminTrafficStatsItem = {
  engineId: string | null;
  engine: string;
  tokensTotal: number;
  avgResponseMs: number;
  successRate: number;
  costAmount: number;
  currency: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
};

export type AdminOperationsAuditContext = {
  actorId: string;
  ip?: string | null;
  userAgent?: string | null;
};

export type AdminOperationsErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT';

export type AdminOperationsDomainErrorCode =
  | AdminOperationsErrorCode
  | 'DUPLICATE_USER_EMAIL'
  | 'DUPLICATE_USER_USERNAME'
  | 'RESOURCE_ALREADY_DELETED';

const ADMIN_OPERATIONS_DOMAIN_ERROR_CODES = [
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_USER_EMAIL',
  'DUPLICATE_USER_USERNAME',
  'RESOURCE_ALREADY_DELETED',
] as const satisfies readonly AdminOperationsDomainErrorCode[];

const ADMIN_OPERATIONS_DOMAIN_ERROR_CODE_SET = new Set<string>(ADMIN_OPERATIONS_DOMAIN_ERROR_CODES);

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const ACTIVITY_STATUSES = ['draft', 'published'] as const;
const CONTENT_CATEGORIES = ['chat', 'inspiration', 'comment', 'teaching'] as const;
const DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES = 120;
const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 180;
const DEFAULT_INVITE_TOTAL_QUOTA = 100;
const DEFAULT_WEB_IDLE_TIMEOUT_MINUTES = 10080;

export class AdminOperationsServiceError extends Error {
  constructor(
    public readonly code: AdminOperationsErrorCode,
    message: string,
    public readonly domainCode: AdminOperationsDomainErrorCode = code
  ) {
    super(message);
  }
}

@Injectable()
export class AdminOperationsService {
  constructor(private readonly adminOperationsRepository: AdminOperationsRepository) {}

  async listUsers(
    input: AdminUserListInput = {}
  ): Promise<AdminOperationListResult<AdminUserItem>> {
    const pageInput = normalizePageInput(input);
    const q = trimOptional(input.q)?.toLowerCase();
    const role = trimOptional(input.role) ?? 'user';
    const status = normalizeOptionalUserStatus(input.status);
    let rows = await this.adminOperationsRepository.listUsers({
      includeDeleted: status === 'deleted',
    });
    const [creditAccounts, lastLogins] = await Promise.all([
      this.adminOperationsRepository.listUserCreditAccounts(rows.map((row) => row.id)),
      this.adminOperationsRepository.listLastLogins(rows.map((row) => row.id)),
    ]);
    const creditByUserId = new Map(creditAccounts.map((account) => [account.userId, account]));
    const lastLoginByUserId = new Map(lastLogins.map((login) => [login.userId, login.lastLoginAt]));

    if (q) {
      rows = rows.filter((row) => `${row.email} ${row.name ?? ''}`.toLowerCase().includes(q));
    }
    if (role) {
      rows = rows.filter((row) => row.role === role);
    }
    if (status) {
      rows = rows.filter((row) => getUserStatus(row) === status);
    }
    if (input.isBlacklisted !== undefined) {
      rows = rows.filter((row) => row.isBlacklisted === input.isBlacklisted);
    }

    return toListResult(rows, pageInput, (row) =>
      toUserItem(row, creditByUserId.get(row.id), lastLoginByUserId.get(row.id) ?? null)
    );
  }

  async updateUserStatus(
    input: AdminUserStatusInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const id = requireId(input.id, 'User id is required');
    const status = normalizeMutableUserStatus(input.status);
    const isActive = status === 'active';
    const user = await this.adminOperationsRepository.updateUserStatus(id, isActive);

    if (!user) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'User not found');
    }

    return toUserItem(user);
  }

  async updateUserBlacklist(
    input: AdminUserBlacklistInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const id = requireId(input.id, 'User id is required');
    const isBlacklisted = requireBoolean(
      input.isBlacklisted,
      'User isBlacklisted must be a boolean'
    );
    const user = await this.adminOperationsRepository.updateUserBlacklist(id, isBlacklisted);

    if (!user) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'User not found');
    }

    return toUserItem(user);
  }

  async deleteUser(
    input: AdminUserDeleteInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const id = requireId(input.id, 'User id is required');
    const user = await this.adminOperationsRepository.softDeleteUser(id);

    if (!user) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'User not found');
    }

    return toUserItem(user);
  }

  async inviteUser(
    input: AdminUserInviteInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const email = requireEmail(input.email, 'Invite email is required');
    const name = normalizeNullableText(input.name, 'Invite name', 100);
    const username = normalizeNullableText(input.username, 'Invite username', 64);
    const password =
      input.password === undefined
        ? `invited:${randomUUID()}`
        : requirePassword(input.password, 'Invite password is required');
    const totalQuota =
      input.totalQuota === undefined
        ? DEFAULT_INVITE_TOTAL_QUOTA
        : requireNonNegativeInteger(input.totalQuota, 'Invite totalQuota is invalid');
    const [existingEmail, existingUsername] = await Promise.all([
      this.adminOperationsRepository.findUserByEmail(email),
      username ? this.adminOperationsRepository.findUserByUsername(username) : null,
    ]);

    if (existingEmail) {
      throw new AdminOperationsServiceError(
        'CONFLICT',
        'User email already exists',
        'DUPLICATE_USER_EMAIL'
      );
    }
    if (existingUsername) {
      throw new AdminOperationsServiceError(
        'CONFLICT',
        'Username already exists',
        'DUPLICATE_USER_USERNAME'
      );
    }

    const user = await this.adminOperationsRepository.createInvitedUser({
      email,
      name,
      password: await hashPassword(password),
      totalQuota,
      username,
    });

    return toUserItem(user, { balance: totalQuota, cycleLimit: totalQuota });
  }

  async createAdminUser(
    input: AdminCreateAdminUserInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const username = requireUsername(input.username, 'Admin username is required');
    const email = requireEmail(input.email, 'Admin email is required');
    const name = normalizeNullableText(input.name, 'Admin name', 100);
    const password = requirePassword(input.password, 'Admin password is required');
    const [existingEmail, existingUsername] = await Promise.all([
      this.adminOperationsRepository.findUserByEmail(email),
      this.adminOperationsRepository.findUserByUsername(username),
    ]);

    if (existingEmail) {
      throw new AdminOperationsServiceError(
        'CONFLICT',
        'User email already exists',
        'DUPLICATE_USER_EMAIL'
      );
    }
    if (existingUsername) {
      throw new AdminOperationsServiceError(
        'CONFLICT',
        'Username already exists',
        'DUPLICATE_USER_USERNAME'
      );
    }

    const user = await this.adminOperationsRepository.createAdminUser({
      email,
      name,
      password: await hashPassword(password),
      username,
    });

    return toUserItem(user);
  }

  async updateUserQuota(
    input: AdminUserQuotaInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminUserItem> {
    void _auditContext;

    const id = requireId(input.id, 'User id is required');
    const credits = requireNonNegativeInteger(input.credits, 'User credits is invalid');
    const totalQuota = requireNonNegativeInteger(input.totalQuota, 'User totalQuota is invalid');

    if (credits > totalQuota) {
      throw new AdminOperationsServiceError('BAD_REQUEST', 'User credits cannot exceed totalQuota');
    }

    const user = await this.adminOperationsRepository.findUserById(id);

    if (!user) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'User not found');
    }

    const creditAccount = await this.adminOperationsRepository.updateUserCreditAccount({
      balance: credits,
      cycleLimit: totalQuota,
      userId: id,
    });

    return toUserItem(user, creditAccount);
  }

  async listUserActivity(
    input: AdminUserActivityInput
  ): Promise<AdminOperationListResult<AdminUserActivityItem>> {
    const userId = requireId(input.userId, 'User id is required');
    const pageInput = normalizePageInput(input);
    const [sessions, modelCalls, creditTransactions, conversations] = await Promise.all([
      this.adminOperationsRepository.listUserSessions(userId),
      this.adminOperationsRepository.listUserModelCalls(userId),
      this.adminOperationsRepository.listUserCreditTransactions(userId),
      this.adminOperationsRepository.listUserConversations(userId),
    ]);
    const rows = [
      ...sessions.map(toUserLoginActivity),
      ...modelCalls.map(toUserModelCallActivity),
      ...creditTransactions.map(toUserCreditActivity),
      ...conversations.map(toUserConversationActivity),
    ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    return toListResult(rows, pageInput, (row) => row);
  }

  async listActivities(
    input: AdminActivityListInput = {}
  ): Promise<AdminOperationListResult<AdminActivityItem>> {
    const pageInput = normalizePageInput(input);
    const q = trimOptional(input.q)?.toLowerCase();
    const status = normalizeOptionalActivityStatus(input.status);
    let rows = await this.adminOperationsRepository.listActivities();

    if (q) {
      rows = rows.filter((row) => `${row.title} ${row.content}`.toLowerCase().includes(q));
    }
    if (status) {
      rows = rows.filter((row) => row.status === status);
    }

    return toListResult(rows, pageInput, toActivityItem);
  }

  async createActivity(
    input: AdminActivityCreateInput,
    auditContext: AdminOperationsAuditContext
  ): Promise<AdminActivityItem> {
    const status = normalizeActivityStatus(input.status ?? 'draft');
    const activity = await this.adminOperationsRepository.createActivity({
      title: requireText(input.title, 'Activity title is required', 200),
      content: requireText(input.content, 'Activity content is required', 20_000),
      status,
      publishedAt: status === 'published' ? new Date() : null,
      createdByAdminId: auditContext.actorId,
    });

    return toActivityItem(activity);
  }

  async updateActivity(
    input: AdminActivityUpdateInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminActivityItem> {
    void _auditContext;

    const id = requireId(input.id, 'Activity id is required');
    const existing = await this.adminOperationsRepository.findActivityById(id);

    if (!existing) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'Activity not found');
    }

    const nextStatus =
      input.status === undefined ? existing.status : normalizeActivityStatus(input.status);
    const update = {
      ...(input.title !== undefined
        ? { title: requireText(input.title, 'Activity title is required', 200) }
        : {}),
      ...(input.content !== undefined
        ? { content: requireText(input.content, 'Activity content is required', 20_000) }
        : {}),
      ...(input.status !== undefined
        ? {
            status: nextStatus,
            publishedAt:
              nextStatus === 'published' && existing.status !== 'published'
                ? new Date()
                : existing.publishedAt,
          }
        : {}),
    };

    if (Object.keys(update).length === 0) {
      throw new AdminOperationsServiceError('BAD_REQUEST', 'Activity update has no changes');
    }

    const activity = await this.adminOperationsRepository.updateActivity(id, update);

    if (!activity) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'Activity not found');
    }

    return toActivityItem(activity);
  }

  async deleteActivity(
    input: AdminEntityIdInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminActivityItem> {
    void _auditContext;

    const id = requireId(input.id, 'Activity id is required');
    const activity = await this.adminOperationsRepository.softDeleteActivity(id);

    if (!activity) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'Activity not found');
    }

    return toActivityItem(activity);
  }

  async getInviteTree(): Promise<AdminInviteTreeNode[]> {
    const [usersRows, relations, codes, rewardConfig] = await Promise.all([
      this.adminOperationsRepository.listUsers(),
      this.adminOperationsRepository.listInviteRelations(),
      this.adminOperationsRepository.listInviteCodes(),
      this.adminOperationsRepository.getFissionRewardConfig(),
    ]);
    const codeByUser = new Map(codes.map((code) => [code.userId, code.code]));
    const nodeByUser = new Map<string, AdminInviteTreeNode>();
    const inviterReward = rewardConfig?.inviterQuota ?? 0;

    for (const user of usersRows) {
      nodeByUser.set(user.id, {
        id: user.id,
        email: user.email,
        name: user.name,
        inviteCode: codeByUser.get(user.id) ?? null,
        totalInvited: 0,
        rewardEarned: 0,
        children: [],
      });
    }

    const inviteeIds = new Set<string>();

    for (const relation of relations) {
      const inviter = nodeByUser.get(relation.inviterUserId);
      const invitee = nodeByUser.get(relation.inviteeUserId);

      if (!inviter || !invitee) {
        continue;
      }

      inviteeIds.add(relation.inviteeUserId);
      inviter.children.push(invitee);
      inviter.totalInvited += 1;
      inviter.rewardEarned += relation.rewardGranted ? inviterReward : 0;
    }

    return [...nodeByUser.values()].filter((node) => !inviteeIds.has(node.id));
  }

  async getFissionRewardConfig(): Promise<AdminFissionRewardConfig> {
    return toFissionRewardConfig(await this.adminOperationsRepository.getFissionRewardConfig());
  }

  async updateFissionRewardConfig(
    input: AdminFissionRewardConfigUpdateInput,
    auditContext: AdminOperationsAuditContext
  ): Promise<AdminFissionRewardConfig> {
    const config = await this.adminOperationsRepository.updateFissionRewardConfig({
      inviterQuota: requireNonNegativeInteger(input.inviterQuota, 'Inviter quota is invalid'),
      inviteeQuota: requireNonNegativeInteger(input.inviteeQuota, 'Invitee quota is invalid'),
      enableMultiTier: requireBoolean(input.enableMultiTier, 'Enable multi tier must be a boolean'),
      tier2RewardPct: requirePercentage(input.tier2RewardPct, 'Tier 2 reward percent is invalid'),
      isActive: requireBoolean(input.isActive, 'Fission reward isActive must be a boolean'),
      updatedByAdminId: auditContext.actorId,
    });

    return toFissionRewardConfig(config);
  }

  async getAlarmConfig(): Promise<AdminAlarmConfig> {
    return toAlarmConfig(await this.adminOperationsRepository.getAlarmConfig());
  }

  async updateAlarmConfig(
    input: AdminAlarmConfigUpdateInput,
    auditContext: AdminOperationsAuditContext
  ): Promise<AdminAlarmConfig> {
    const config = await this.adminOperationsRepository.updateAlarmConfig({
      costThresholdAmount: requireNonNegativeNumber(input.threshold, 'Alarm threshold is invalid'),
      currency: requireText(input.currency ?? 'CNY', 'Alarm currency is required', 10),
      email: requireEmail(input.email, 'Alarm email is required'),
      updatedByAdminId: auditContext.actorId,
    });

    return toAlarmConfig(config);
  }

  async getSystemConfig(): Promise<AdminSystemConfig> {
    return toSystemConfig(await this.adminOperationsRepository.getSystemConfig());
  }

  async updateSystemConfig(
    input: AdminSystemConfigUpdateInput,
    auditContext: AdminOperationsAuditContext
  ): Promise<AdminSystemConfig> {
    const current = toSystemConfig(await this.adminOperationsRepository.getSystemConfig());
    const config = await this.adminOperationsRepository.updateSystemConfig({
      adminIdleTimeoutMinutes: requirePositiveInteger(
        input.adminIdleTimeoutMinutes ?? current.adminIdleTimeoutMinutes,
        'Admin idle timeout is invalid'
      ),
      auditLogRetentionDays: requirePositiveInteger(
        input.auditLogRetentionDays ?? current.auditLogRetentionDays,
        'Audit log retention days is invalid'
      ),
      webIdleTimeoutMinutes: requirePositiveInteger(
        input.webIdleTimeoutMinutes ?? current.webIdleTimeoutMinutes,
        'Web idle timeout is invalid'
      ),
      updatedByAdminId: auditContext.actorId,
    });

    return toSystemConfig(config);
  }

  async cleanupSystemAuditLogsByDateRange(
    input: AdminSystemAuditCleanupRangeInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminSystemAuditCleanupResult> {
    void _auditContext;

    const range = normalizeRequiredDateRange(input);
    const deletedCount = await this.adminOperationsRepository.deleteSystemAuditLogsByTimestampRange(
      {
        startTimestamp: toUnixTimestamp(range.startDate),
        endTimestamp: toUnixTimestamp(range.endDate),
      }
    );

    return { deletedCount };
  }

  async cleanupSystemAuditLogsByRetention(
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminSystemAuditCleanupResult> {
    void _auditContext;

    const config = toSystemConfig(await this.adminOperationsRepository.getSystemConfig());
    const cutoffTimestamp =
      Math.floor(Date.now() / 1000) - config.auditLogRetentionDays * 24 * 60 * 60;
    const deletedCount =
      await this.adminOperationsRepository.deleteSystemAuditLogsBefore(cutoffTimestamp);

    return {
      cutoffTimestamp,
      deletedCount,
      retentionDays: config.auditLogRetentionDays,
    };
  }

  async listSystemAuditLogs(
    input: AdminSystemAuditListInput = {}
  ): Promise<AdminOperationListResult<AdminSystemAuditItem>> {
    const pageInput = normalizePageInput(input);
    const range = normalizeDateRange(input);
    const level = normalizeOptionalAuditLevel(input.level);
    const logType = normalizeOptionalAuditLogType(input.logType);
    let rows = await this.adminOperationsRepository.listSystemAuditLogs(range);

    if (level !== undefined) {
      rows = rows.filter((row) => row.level === level);
    }
    if (logType !== undefined) {
      rows = rows.filter((row) => row.logType === logType);
    }
    if (input.q) {
      const q = input.q.toLowerCase();
      rows = rows.filter((row) => JSON.stringify(row.details).toLowerCase().includes(q));
    }

    return toListResult(rows, pageInput, toSystemAuditItem);
  }

  async exportSystemAuditLogs(
    input: AdminAuditExportInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminAuditExportResult> {
    void _auditContext;

    const range = normalizeDateRange(input);
    const rows = await this.adminOperationsRepository.listSystemAuditLogs(range);

    return {
      filename: `system-audit-${dateStamp()}.csv`,
      contentType: 'text/csv',
      content: toCsv(
        ['logId', 'timestamp', 'level', 'logType', 'details'],
        rows.map((row) => [
          row.logId,
          row.timestamp,
          row.level,
          row.logType,
          JSON.stringify(row.details),
        ])
      ),
    };
  }

  async listContentAuditSessions(
    input: AdminContentAuditListInput = {}
  ): Promise<AdminOperationListResult<AdminContentAuditItem>> {
    const pageInput = normalizePageInput(input);
    const range = normalizeDateRange(input);
    const userId = trimOptional(input.userId);
    const category = normalizeOptionalContentCategory(input.category);
    let rows = await this.adminOperationsRepository.listContentAuditSessions(range);

    if (userId) {
      rows = rows.filter((row) => row.userId === userId);
    }
    if (category) {
      rows = rows.filter((row) => row.category === category);
    }
    if (input.isDeleted !== undefined) {
      rows = rows.filter((row) => row.isDeleted === input.isDeleted);
    }
    if (input.q) {
      const q = input.q.toLowerCase();
      rows = rows.filter((row) => `${row.title} ${row.userEmail}`.toLowerCase().includes(q));
    }

    return toListResult(rows, pageInput, toContentAuditItem);
  }

  async getContentAuditSession(input: AdminEntityIdInput): Promise<AdminContentAuditDetail> {
    const id = requireId(input.id, 'Content audit session id is required');
    const session = await this.adminOperationsRepository.findContentAuditSessionById(id);

    if (!session) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'Content audit session not found');
    }

    const messages = await this.adminOperationsRepository.listContentAuditMessages(
      session.conversationId
    );

    return {
      ...toContentAuditItem(session),
      messages: messages.map(toContentAuditMessage),
    };
  }

  async deleteContentAuditSession(
    input: AdminEntityIdInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminContentAuditItem> {
    void _auditContext;

    const id = requireId(input.id, 'Content audit session id is required');
    const existing = await this.adminOperationsRepository.findContentAuditSessionById(id);

    if (!existing) {
      throw new AdminOperationsServiceError('NOT_FOUND', 'Content audit session not found');
    }
    if (existing.isDeleted) {
      throw new AdminOperationsServiceError(
        'CONFLICT',
        'Content audit session already deleted',
        'RESOURCE_ALREADY_DELETED'
      );
    }

    const session = await this.adminOperationsRepository.softDeleteContentAuditSession(id);

    if (!session) {
      const current = await this.adminOperationsRepository.findContentAuditSessionById(id);

      if (current?.isDeleted) {
        throw new AdminOperationsServiceError(
          'CONFLICT',
          'Content audit session already deleted',
          'RESOURCE_ALREADY_DELETED'
        );
      }

      throw new AdminOperationsServiceError('NOT_FOUND', 'Content audit session not found');
    }

    return toContentAuditItem(session);
  }

  async exportContentAuditSessions(
    input: AdminAuditExportInput,
    _auditContext: AdminOperationsAuditContext
  ): Promise<AdminAuditExportResult> {
    void _auditContext;

    const range = normalizeDateRange(input);
    const rows = await this.adminOperationsRepository.listContentAuditSessions(range);

    return {
      filename: `content-audit-${dateStamp()}.csv`,
      contentType: 'text/csv',
      content: toCsv(
        ['id', 'conversationId', 'userEmail', 'category', 'messageCount', 'isDeleted', 'updatedAt'],
        rows.map((row) => [
          row.id,
          row.conversationId,
          row.userEmail,
          row.category,
          row.messageCount,
          row.isDeleted,
          row.updatedAt.toISOString(),
        ])
      ),
    };
  }

  async listTrafficStats(input: AdminTrafficStatsInput = {}): Promise<AdminTrafficStatsItem[]> {
    const rows = await this.adminOperationsRepository.listTrafficStats(normalizeDateRange(input));

    return rows.map((row) => ({
      engineId: row.engineId,
      engine: row.engine ?? 'Mock AI',
      tokensTotal: Number(row.tokensTotal),
      avgResponseMs: Number(row.avgResponseMs),
      successRate: row.totalCalls === 0 ? 0 : Number(row.successCalls) / Number(row.totalCalls),
      costAmount: Number(row.costAmount),
      currency: row.currency ?? 'CNY',
      totalCalls: Number(row.totalCalls),
      successCalls: Number(row.successCalls),
      failedCalls: Number(row.failedCalls),
    }));
  }
}

export function isAdminOperationsDomainErrorCode(
  value: unknown
): value is AdminOperationsDomainErrorCode {
  return typeof value === 'string' && ADMIN_OPERATIONS_DOMAIN_ERROR_CODE_SET.has(value);
}

function toUserItem(
  row: AdminOperationsUserRow,
  creditAccount?: Pick<UserCreditAccountRow, 'balance' | 'cycleLimit'>,
  lastLoginAt: Date | null = null
): AdminUserItem {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    displayName: row.name ?? row.email,
    role: row.role,
    status: getUserStatus(row),
    isBlacklisted: row.isBlacklisted,
    credits: creditAccount?.balance ?? 0,
    totalQuota: creditAccount?.cycleLimit ?? 0,
    lastLoginAt: lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function getUserStatus(
  row: Pick<AdminOperationsUserRow, 'deletedAt' | 'isActive'>
): AdminUserStatus {
  if (row.deletedAt) {
    return 'deleted';
  }

  return row.isActive ? 'active' : 'disabled';
}

function toUserLoginActivity(row: SessionRow): AdminUserActivityItem {
  return {
    id: row.id,
    type: 'login',
    title: '用户登录',
    description: row.ip ? `登录 IP ${row.ip}` : '用户登录',
    createdAt: row.createdAt.toISOString(),
    metadata: {
      ip: row.ip,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt.toISOString(),
    },
  };
}

function toUserModelCallActivity(row: AiModelCallRow): AdminUserActivityItem {
  return {
    id: row.id,
    type: 'ai_call',
    title: row.modelName ? `AI 调用 ${row.modelName}` : 'AI 调用',
    description: `${row.status} · ${row.totalTokens ?? 0} tokens`,
    createdAt: row.createdAt.toISOString(),
    metadata: {
      conversationId: row.conversationId,
      messageId: row.messageId,
      engineId: row.engineId,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      latencyMs: row.latencyMs,
      costAmount: row.costAmount,
      currency: row.currency,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
    },
  };
}

function toUserCreditActivity(row: CreditTransactionRow): AdminUserActivityItem {
  return {
    id: row.id,
    type: 'credit',
    title: `额度${row.direction === 'in' ? '增加' : '消耗'}`,
    description: `${row.reason} · ${row.amount}`,
    createdAt: row.createdAt.toISOString(),
    metadata: {
      direction: row.direction,
      reason: row.reason,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      relatedType: row.relatedType,
      relatedId: row.relatedId,
      createdByAdminId: row.createdByAdminId,
    },
  };
}

function toUserConversationActivity(row: UserConversationRow): AdminUserActivityItem {
  return {
    id: row.id,
    type: 'conversation',
    title: row.title,
    description: `${row.category} 会话`,
    createdAt: row.updatedAt.toISOString(),
    metadata: {
      category: row.category,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

function toActivityItem(row: ActivityRow): AdminActivityItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdByAdminId: row.createdByAdminId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSystemAuditItem(row: SystemAuditLogRow): AdminSystemAuditItem {
  return {
    logId: row.logId,
    timestamp: row.timestamp,
    level: row.level,
    details: row.details,
    logType: row.logType,
  };
}

function toContentAuditItem(row: ContentAuditSessionRow): AdminContentAuditItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    userEmail: row.userEmail,
    category: row.category,
    title: row.title,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    metadata: row.metadata,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toContentAuditMessage(row: AiMessageRow): AdminContentAuditMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function toFissionRewardConfig(row: FissionRewardConfigRow | null): AdminFissionRewardConfig {
  return {
    inviterQuota: row?.inviterQuota ?? 0,
    inviteeQuota: row?.inviteeQuota ?? 0,
    enableMultiTier: row?.enableMultiTier ?? false,
    tier2RewardPct: row?.tier2RewardPct ?? 0,
    isActive: row?.isActive ?? false,
    updatedByAdminId: row?.updatedByAdminId ?? null,
    updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
  };
}

function toAlarmConfig(row: AlarmConfigRow | null): AdminAlarmConfig {
  return {
    threshold: row?.costThresholdAmount ?? 0,
    currency: row?.currency ?? 'CNY',
    email: row?.email ?? '',
    updatedByAdminId: row?.updatedByAdminId ?? null,
    updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
  };
}

function toSystemConfig(row: SystemAuthConfigRow | null): AdminSystemConfig {
  return {
    adminIdleTimeoutMinutes: row?.adminIdleTimeoutMinutes ?? DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES,
    auditLogRetentionDays: row?.auditLogRetentionDays ?? DEFAULT_AUDIT_LOG_RETENTION_DAYS,
    webIdleTimeoutMinutes: row?.webIdleTimeoutMinutes ?? DEFAULT_WEB_IDLE_TIMEOUT_MINUTES,
    updatedByAdminId: row?.updatedByAdminId ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

function toListResult<TRow, TItem>(
  rows: TRow[],
  pageInput: { page: number; pageSize: number },
  mapper: (row: TRow) => TItem
): AdminOperationListResult<TItem> {
  const start = (pageInput.page - 1) * pageInput.pageSize;
  const items = rows.slice(start, start + pageInput.pageSize).map(mapper);

  return {
    items,
    total: rows.length,
    page: pageInput.page,
    pageSize: pageInput.pageSize,
  };
}

function normalizePageInput(input: { page?: number; pageSize?: number }): {
  page: number;
  pageSize: number;
} {
  const page = input.page ?? DEFAULT_PAGE;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

  if (!Number.isInteger(page) || page < 1) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Page must be a positive integer');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Page size is invalid');
  }

  return { page, pageSize };
}

function normalizeDateRange(input: { startDate?: string; endDate?: string }): {
  startDate?: Date;
  endDate?: Date;
} {
  const startDate = input.startDate
    ? parseDate(input.startDate, 'Start date is invalid')
    : undefined;
  const endDate = input.endDate ? parseDate(input.endDate, 'End date is invalid') : undefined;

  if (startDate && endDate && startDate > endDate) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Start date must be before end date');
  }

  return {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
}

function normalizeRequiredDateRange(input: { startDate?: string; endDate?: string }): {
  endDate: Date;
  startDate: Date;
} {
  if (!input.startDate || !input.endDate) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Audit cleanup date range is required');
  }

  const range = normalizeDateRange(input);

  if (!range.startDate || !range.endDate) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Audit cleanup date range is required');
  }

  return {
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function dateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string, message: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return date;
}

function normalizeOptionalActivityStatus(value: unknown): ActivityRow['status'] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeActivityStatus(value);
}

function normalizeActivityStatus(value: unknown): ActivityRow['status'] {
  if (typeof value !== 'string' || !ACTIVITY_STATUSES.includes(value as ActivityRow['status'])) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Activity status is invalid');
  }

  return value as ActivityRow['status'];
}

function normalizeOptionalUserStatus(value: unknown): AdminUserStatus | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 'active' && value !== 'disabled' && value !== 'deleted') {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'User status is invalid');
  }

  return value;
}

function normalizeMutableUserStatus(value: unknown): AdminMutableUserStatus {
  if (value !== 'active' && value !== 'disabled') {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'User status is invalid');
  }

  return value;
}

function normalizeOptionalAuditLevel(value: unknown): AdminAuditLevel | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 0 && value !== 1) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Audit level is invalid');
  }

  return value;
}

function normalizeOptionalAuditLogType(value: unknown): AdminAuditLogType | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 13) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Audit log type is invalid');
  }

  return value as AdminAuditLogType;
}

function normalizeOptionalContentCategory(
  value: unknown
): ContentAuditSessionRow['category'] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !CONTENT_CATEGORIES.includes(value as ContentAuditSessionRow['category'])
  ) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Content audit category is invalid');
  }

  return value as ContentAuditSessionRow['category'];
}

function requireId(value: unknown, message: string): string {
  return requireText(value, message, 100);
}

function requireEmail(value: unknown, message: string): string {
  const email = requireText(value, message, 255).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Email is invalid');
  }

  return email;
}

function requireUsername(value: unknown, message: string): string {
  const username = requireText(value, message, 64);

  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Username is invalid');
  }

  return username;
}

function requirePassword(value: unknown, message: string): string {
  const password = requireText(value, message, 200);

  if (password.length < 8) {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Password must be at least 8 characters');
  }

  return password;
}

function requireText(value: unknown, message: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new AdminOperationsServiceError(
      'BAD_REQUEST',
      `${message.replace(' is required', '')} is too long`
    );
  }

  return trimmed;
}

function normalizeNullableText(
  value: string | null | undefined,
  label: string,
  maxLength: number
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new AdminOperationsServiceError('BAD_REQUEST', `${label} is too long`);
  }

  return trimmed;
}

function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return value;
}

function requireNonNegativeInteger(value: unknown, message: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return Number(value);
}

function requirePositiveInteger(value: unknown, message: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return Number(value);
}

function requirePercentage(value: unknown, message: string): number {
  const number = requireNonNegativeInteger(value, message);

  if (number > 100) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return number;
}

function requireNonNegativeNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new AdminOperationsServiceError('BAD_REQUEST', message);
  }

  return value;
}

function trimOptional(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new AdminOperationsServiceError('BAD_REQUEST', 'Filter must be a string');
  }

  return value.trim() || undefined;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
