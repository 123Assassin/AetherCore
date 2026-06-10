import { requireAdminSession } from '../common/guards/admin-session.guard.js';
import type {
  AdminAuditRequestResult,
  AdminAuditRequestType,
  AdminAuditService,
} from '../modules/admin-audit/admin-audit.service.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { TRPCContext } from './context.js';
import type { publicProcedure } from './router.js';

export function createAuditedAdminProcedure(input: {
  adminAuditService?: AdminAuditService | undefined;
  authService: AuthService;
  pathPrefix?: string | undefined;
  publicProcedure: typeof publicProcedure;
}) {
  return input.publicProcedure.use(async ({ ctx, getRawInput, next, path, type }) => {
    const adminSession = await requireAdminSession(input.authService, ctx);
    const rawInput = await getRawInput();
    const nextResult = await next({
      ctx: {
        ...ctx,
        adminSession,
      },
    });

    await writeAdminApiAudit(input.adminAuditService, {
      actorAccount: getAdminSessionAccount(adminSession.user),
      actorId: adminSession.user.id,
      input: rawInput,
      ip: getRequestIp(ctx),
      path: withPathPrefix(path, input.pathPrefix),
      result: toAuditResult(nextResult),
      type,
      userAgent: getHeader(ctx, 'user-agent'),
    });

    return nextResult;
  });
}

export async function writeAdminApiAudit(
  adminAuditService: AdminAuditService | undefined,
  input: {
    actorAccount: string;
    actorId: string;
    input: unknown;
    ip: string | null;
    path: string;
    result: AdminAuditRequestResult;
    type: AdminAuditRequestType;
    userAgent: string | null;
  }
): Promise<void> {
  if (!adminAuditService) {
    return;
  }

  try {
    await adminAuditService.recordAdminApiRequest(input);
  } catch {
    // Audit writes are best-effort so request results are not changed by logging failures.
  }
}

export function getAdminSessionAccount(user: {
  email?: string | null;
  id: string;
  name?: string | null;
  username?: string | null;
}): string {
  return user.username || user.email || user.name || user.id;
}

export function toSuccessAuditResult(data: unknown): AdminAuditRequestResult {
  return {
    data,
    success: true,
  };
}

export function getRequestIp(ctx: TRPCContext): string | null {
  return getHeader(ctx, 'x-forwarded-for')?.split(',')[0]?.trim() || getRequestProperty(ctx, 'ip');
}

export function getHeader(ctx: TRPCContext, name: string): string | null {
  const req = ctx.req as { headers?: Record<string, string | string[] | undefined> };
  const value = req.headers?.[name];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toAuditResult(result: {
  data?: unknown;
  error?: unknown;
  ok: boolean;
}): AdminAuditRequestResult {
  if (result.ok) {
    return toSuccessAuditResult(result.data);
  }

  const error = result.error;

  return {
    error: {
      code: getErrorCode(error),
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    success: false,
  };
}

function getErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;

    if (typeof code === 'string') {
      return code;
    }
  }

  return 'INTERNAL_SERVER_ERROR';
}

function getRequestProperty(ctx: TRPCContext, name: 'ip'): string | null {
  const req = ctx.req as { ip?: string };

  return req[name] ?? null;
}

function withPathPrefix(path: string, prefix: string | undefined): string {
  if (!prefix || path.startsWith(`${prefix}.`)) {
    return path;
  }

  return `${prefix}.${path}`;
}
