import { TRPCError } from '@trpc/server';

import {
  requireAdminSession,
  resolveAdminSession,
} from '../../common/guards/admin-session.guard.js';
import { AuthServiceError, type AuthService } from '../../modules/auth/auth.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

type AdminLoginInput = {
  username: string;
  password: string;
};

type AdminChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export function createAuthRouter(authService: AuthService, tools: RouterTools) {
  return tools.createTRPCRouter({
    wechatLoginUrl: tools.publicProcedure.query(() => authService.getWeChatLoginUrl()),
    mockLogin: tools.publicProcedure.mutation(({ ctx }) =>
      mapAuthServiceError(() => authService.mockLogin(ctx))
    ),
    logout: tools.publicProcedure.mutation(({ ctx }) => authService.userLogout(ctx)),
  });
}

export function createAdminAuthRouter(authService: AuthService, tools: RouterTools) {
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
    changePassword: adminProcedure
      .input(parseAdminChangePasswordInput)
      .mutation(async ({ ctx, input }) => {
        return mapAuthServiceError(() =>
          authService.changeAdminPassword(input, ctx.adminSession, ctx)
        );
      }),
    login: tools.publicProcedure
      .input(parseAdminLoginInput)
      .mutation(({ ctx, input }) => authService.adminLogin(input, ctx)),
    logout: tools.publicProcedure.mutation(({ ctx }) => authService.adminLogout(ctx)),
    session: tools.publicProcedure.query(async ({ ctx }) => {
      const session = await resolveAdminSession(authService, ctx);

      if (!session) {
        return { authenticated: false };
      }

      return authService.getAdminSession(ctx);
    }),
  });
}

function parseAdminChangePasswordInput(input: unknown): AdminChangePasswordInput {
  if (!isRecord(input)) {
    throwInvalidChangePasswordInput();
  }

  if (typeof input.currentPassword !== 'string' || typeof input.newPassword !== 'string') {
    throwInvalidChangePasswordInput();
  }

  if (!input.currentPassword || !input.newPassword) {
    throwInvalidChangePasswordInput();
  }

  return {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  };
}

function parseAdminLoginInput(input: unknown): AdminLoginInput {
  if (!isRecord(input)) {
    throwInvalidInput();
  }

  if (typeof input.username !== 'string' || typeof input.password !== 'string') {
    throwInvalidInput();
  }

  const username = input.username.trim();

  if (!username || !input.password) {
    throwInvalidInput();
  }

  return {
    username,
    password: input.password,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwInvalidChangePasswordInput(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Admin password change requires currentPassword and newPassword',
  });
}

function throwInvalidInput(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Admin login requires username and password',
  });
}

async function mapAuthServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
      });
    }

    throw error;
  }
}
