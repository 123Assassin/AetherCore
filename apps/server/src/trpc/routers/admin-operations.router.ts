import { TRPCError } from '@trpc/server';
import { requireAdminSession } from '../../common/guards/admin-session.guard.js';
import type { AdminSession, AuthService } from '../../modules/auth/auth.service.js';
import {
  AdminOperationsServiceError,
  type AdminActivityCreateInput,
  type AdminActivityListInput,
  type AdminActivityUpdateInput,
  type AdminAlarmConfigUpdateInput,
  type AdminAuditExportInput,
  type AdminContentAuditListInput,
  type AdminEntityIdInput,
  type AdminFissionRewardConfigUpdateInput,
  type AdminOperationsAuditContext,
  type AdminOperationsService,
  type AdminSystemAuditListInput,
  type AdminTrafficStatsInput,
  type AdminUserActivityInput,
  type AdminUserBlacklistInput,
  type AdminUserInviteInput,
  type AdminUserListInput,
  type AdminMutableUserStatus,
  type AdminUserStatus,
  type AdminUserStatusInput,
} from '../../modules/admin-operations/admin-operations.service.js';
import type { TRPCContext } from '../context.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

type AdminTRPCContext = TRPCContext & {
  adminSession: AdminSession;
};

export function createAdminOperationsRouter(
  authService: AuthService,
  adminOperationsService: AdminOperationsService,
  tools: RouterTools
) {
  const adminProcedure = tools.publicProcedure.use(async ({ ctx, next }) => {
    const adminSession = await requireAdminSession(authService, ctx);

    return next({
      ctx: {
        ...ctx,
        adminSession,
      },
    });
  });

  return tools.createTRPCRouter({
    users: tools.createTRPCRouter({
      list: adminProcedure.input(parseUserListInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listUsers(input));
      }),
      status: adminProcedure.input(parseUserStatusInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.updateUserStatus(input, getAuditContext(ctx))
        );
      }),
      blacklist: adminProcedure.input(parseUserBlacklistInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.updateUserBlacklist(input, getAuditContext(ctx))
        );
      }),
      delete: adminProcedure.input(parseEntityIdInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.deleteUser(input, getAuditContext(ctx))
        );
      }),
      invite: adminProcedure.input(parseUserInviteInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.inviteUser(input, getAuditContext(ctx))
        );
      }),
      activity: adminProcedure.input(parseUserActivityInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listUserActivity(input));
      }),
    }),
    activities: tools.createTRPCRouter({
      list: adminProcedure.input(parseActivityListInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listActivities(input));
      }),
      create: adminProcedure.input(parseActivityCreateInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.createActivity(input, getAuditContext(ctx))
        );
      }),
      update: adminProcedure.input(parseActivityUpdateInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.updateActivity(input, getAuditContext(ctx))
        );
      }),
      delete: adminProcedure.input(parseEntityIdInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.deleteActivity(input, getAuditContext(ctx))
        );
      }),
    }),
    fission: tools.createTRPCRouter({
      inviteTree: adminProcedure.query(async () => {
        return mapServiceError(() => adminOperationsService.getInviteTree());
      }),
      rewardConfig: tools.createTRPCRouter({
        get: adminProcedure.query(async () => {
          return mapServiceError(() => adminOperationsService.getFissionRewardConfig());
        }),
        update: adminProcedure
          .input(parseFissionRewardConfigUpdateInput)
          .mutation(async ({ input, ctx }) => {
            return mapServiceError(() =>
              adminOperationsService.updateFissionRewardConfig(input, getAuditContext(ctx))
            );
          }),
      }),
    }),
    alarmConfig: tools.createTRPCRouter({
      get: adminProcedure.query(async () => {
        return mapServiceError(() => adminOperationsService.getAlarmConfig());
      }),
      update: adminProcedure.input(parseAlarmConfigUpdateInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.updateAlarmConfig(input, getAuditContext(ctx))
        );
      }),
    }),
    systemAudit: tools.createTRPCRouter({
      list: adminProcedure.input(parseSystemAuditListInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listSystemAuditLogs(input));
      }),
      export: adminProcedure.input(parseAuditExportInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.exportSystemAuditLogs(input, getAuditContext(ctx))
        );
      }),
    }),
    contentAudit: tools.createTRPCRouter({
      list: adminProcedure.input(parseContentAuditListInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listContentAuditSessions(input));
      }),
      detail: adminProcedure.input(parseEntityIdInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.getContentAuditSession(input));
      }),
      export: adminProcedure.input(parseAuditExportInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.exportContentAuditSessions(input, getAuditContext(ctx))
        );
      }),
      delete: adminProcedure.input(parseEntityIdInput).mutation(async ({ input, ctx }) => {
        return mapServiceError(() =>
          adminOperationsService.deleteContentAuditSession(input, getAuditContext(ctx))
        );
      }),
    }),
    trafficStats: tools.createTRPCRouter({
      list: adminProcedure.input(parseTrafficStatsInput).query(async ({ input }) => {
        return mapServiceError(() => adminOperationsService.listTrafficStats(input));
      }),
    }),
  });
}

async function mapServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof AdminOperationsServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
        cause: { domainCode: error.domainCode },
      });
    }

    throw error;
  }
}

function getAuditContext(ctx: AdminTRPCContext): AdminOperationsAuditContext {
  return {
    actorId: ctx.adminSession.user.id,
    ip: getRequestIp(ctx),
    userAgent: getHeader(ctx, 'user-agent'),
  };
}

function parseUserListInput(input: unknown): AdminUserListInput {
  const value = parseOptionalObject(input, 'Admin user list input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'q'),
    ...parseOptionalStringProperty(value, 'role'),
    ...parseOptionalUserStatusProperty(value, 'status'),
    ...parseOptionalBooleanProperty(value, 'isBlacklisted'),
    ...parseOptionalNumberProperty(value, 'page'),
    ...parseOptionalNumberProperty(value, 'pageSize'),
  };
}

function parseUserStatusInput(input: unknown): AdminUserStatusInput {
  const value = parseRequiredObject(input, 'Admin user status input must be an object');

  return {
    id: parseRequiredString(value.id, 'Admin user status requires id'),
    status: parseRequiredMutableUserStatus(value.status, 'Admin user status requires status'),
  };
}

function parseUserBlacklistInput(input: unknown): AdminUserBlacklistInput {
  const value = parseRequiredObject(input, 'Admin user blacklist input must be an object');

  return {
    id: parseRequiredString(value.id, 'Admin user blacklist requires id'),
    isBlacklisted: parseRequiredBoolean(
      value.isBlacklisted,
      'Admin user blacklist requires isBlacklisted'
    ),
  };
}

function parseUserInviteInput(input: unknown): AdminUserInviteInput {
  const value = parseRequiredObject(input, 'Admin user invite input must be an object');

  return {
    email: parseRequiredString(value.email, 'Admin user invite requires email'),
    ...parseOptionalNullableStringProperty(value, 'name'),
    ...parseOptionalNumberProperty(value, 'totalQuota'),
  };
}

function parseUserActivityInput(input: unknown): AdminUserActivityInput {
  const value = parseRequiredObject(input, 'Admin user activity input must be an object');

  return {
    userId: parseRequiredString(value.userId, 'Admin user activity requires userId'),
    ...parseOptionalNumberProperty(value, 'page'),
    ...parseOptionalNumberProperty(value, 'pageSize'),
  };
}

function parseActivityListInput(input: unknown): AdminActivityListInput {
  const value = parseOptionalObject(input, 'Admin activity list input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'q'),
    ...parseOptionalStringProperty(value, 'status'),
    ...parseOptionalNumberProperty(value, 'page'),
    ...parseOptionalNumberProperty(value, 'pageSize'),
  } as AdminActivityListInput;
}

function parseActivityCreateInput(input: unknown): AdminActivityCreateInput {
  const value = parseRequiredObject(input, 'Admin activity create input must be an object');

  return {
    title: parseRequiredString(value.title, 'Admin activity create requires title'),
    content: parseRequiredString(value.content, 'Admin activity create requires content'),
    ...parseOptionalStringProperty(value, 'status'),
  } as AdminActivityCreateInput;
}

function parseActivityUpdateInput(input: unknown): AdminActivityUpdateInput {
  const value = parseRequiredObject(input, 'Admin activity update input must be an object');

  return {
    id: parseRequiredString(value.id, 'Admin activity update requires id'),
    ...parseOptionalStringProperty(value, 'title'),
    ...parseOptionalStringProperty(value, 'content'),
    ...parseOptionalStringProperty(value, 'status'),
  } as AdminActivityUpdateInput;
}

function parseFissionRewardConfigUpdateInput(input: unknown): AdminFissionRewardConfigUpdateInput {
  const value = parseRequiredObject(input, 'Admin fission reward config input must be an object');

  return {
    inviterQuota: parseRequiredNumber(
      value.inviterQuota,
      'Admin fission config requires inviterQuota'
    ),
    inviteeQuota: parseRequiredNumber(
      value.inviteeQuota,
      'Admin fission config requires inviteeQuota'
    ),
    enableMultiTier: parseRequiredBoolean(
      value.enableMultiTier,
      'Admin fission config requires enableMultiTier'
    ),
    tier2RewardPct: parseRequiredNumber(
      value.tier2RewardPct,
      'Admin fission config requires tier2RewardPct'
    ),
    isActive: parseRequiredBoolean(value.isActive, 'Admin fission config requires isActive'),
  };
}

function parseAlarmConfigUpdateInput(input: unknown): AdminAlarmConfigUpdateInput {
  const value = parseRequiredObject(input, 'Admin alarm config input must be an object');

  return {
    threshold: parseRequiredNumber(value.threshold, 'Admin alarm config requires threshold'),
    email: parseRequiredString(value.email, 'Admin alarm config requires email'),
    ...parseOptionalStringProperty(value, 'currency'),
  };
}

function parseSystemAuditListInput(input: unknown): AdminSystemAuditListInput {
  const value = parseOptionalObject(input, 'Admin system audit list input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'q'),
    ...parseOptionalStringProperty(value, 'actorType'),
    ...parseOptionalStringProperty(value, 'actorId'),
    ...parseOptionalStringProperty(value, 'action'),
    ...parseOptionalStringProperty(value, 'startDate'),
    ...parseOptionalStringProperty(value, 'endDate'),
    ...parseOptionalNumberProperty(value, 'page'),
    ...parseOptionalNumberProperty(value, 'pageSize'),
  } as AdminSystemAuditListInput;
}

function parseContentAuditListInput(input: unknown): AdminContentAuditListInput {
  const value = parseOptionalObject(input, 'Admin content audit list input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'q'),
    ...parseOptionalStringProperty(value, 'userId'),
    ...parseOptionalStringProperty(value, 'category'),
    ...parseOptionalBooleanProperty(value, 'isDeleted'),
    ...parseOptionalStringProperty(value, 'startDate'),
    ...parseOptionalStringProperty(value, 'endDate'),
    ...parseOptionalNumberProperty(value, 'page'),
    ...parseOptionalNumberProperty(value, 'pageSize'),
  } as AdminContentAuditListInput;
}

function parseAuditExportInput(input: unknown): AdminAuditExportInput {
  const value = parseOptionalObject(input, 'Admin audit export input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'startDate'),
    ...parseOptionalStringProperty(value, 'endDate'),
  };
}

function parseTrafficStatsInput(input: unknown): AdminTrafficStatsInput {
  const value = parseOptionalObject(input, 'Admin traffic stats input must be an object');

  return {
    ...parseOptionalStringProperty(value, 'startDate'),
    ...parseOptionalStringProperty(value, 'endDate'),
  };
}

function parseEntityIdInput(input: unknown): AdminEntityIdInput {
  const value = parseRequiredObject(input, 'Admin operation id input must be an object');

  return {
    id: parseRequiredString(value.id, 'Admin operation requires id'),
  };
}

function parseOptionalObject(input: unknown, message: string): Record<string, unknown> {
  if (input === undefined) {
    return {};
  }

  return parseRequiredObject(input, message);
}

function parseRequiredObject(input: unknown, message: string): Record<string, unknown> {
  if (!isRecord(input)) {
    throwInvalidInput(message);
  }

  return input;
}

function parseOptionalStringProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'string') {
    throwInvalidInput(`Admin operation ${field} must be a string`);
  }

  return { [field]: value };
}

function parseOptionalNullableStringProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string | null> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }
  if (value === null || typeof value === 'string') {
    return { [field]: value };
  }

  throwInvalidInput(`Admin operation ${field} must be a string or null`);
}

function parseOptionalNumberProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, number> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwInvalidInput(`Admin operation ${field} must be a number`);
  }

  return { [field]: value };
}

function parseOptionalBooleanProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, boolean> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'boolean') {
    throwInvalidInput(`Admin operation ${field} must be a boolean`);
  }

  return { [field]: value };
}

function parseOptionalUserStatusProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, AdminUserStatus> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  return { [field]: parseUserStatus(value, `Admin operation ${field} is invalid`) };
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidInput(message);
  }

  return value;
}

function parseRequiredNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwInvalidInput(message);
  }

  return value;
}

function parseRequiredBoolean(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') {
    throwInvalidInput(message);
  }

  return value;
}

function parseRequiredMutableUserStatus(value: unknown, message: string): AdminMutableUserStatus {
  if (value !== 'active' && value !== 'disabled') {
    throwInvalidInput(message);
  }

  return value;
}

function parseUserStatus(value: unknown, message: string): AdminUserStatus {
  if (value !== 'active' && value !== 'disabled' && value !== 'deleted') {
    throwInvalidInput(message);
  }

  return value;
}

function getRequestIp(ctx: TRPCContext): string | null {
  return getHeader(ctx, 'x-forwarded-for')?.split(',')[0]?.trim() || getRequestProperty(ctx, 'ip');
}

function getHeader(ctx: TRPCContext, name: string): string | null {
  const req = ctx.req as { headers?: Record<string, string | string[] | undefined> };
  const value = req.headers?.[name];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getRequestProperty(ctx: TRPCContext, name: 'ip'): string | null {
  const req = ctx.req as { ip?: string };

  return req[name] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwInvalidInput(message: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message,
  });
}
