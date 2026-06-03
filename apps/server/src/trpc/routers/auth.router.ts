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
  user: string;
  password: string;
};

type AdminChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type WeChatCallbackInput = {
  code: string;
  state: string;
};

export function createAuthRouter(authService: AuthService, tools: RouterTools) {
  return tools.createTRPCRouter({
    userLogin: tools.publicProcedure
      .input(parseLoginInput)
      .mutation(({ ctx, input }) => authService.userLogin(input, ctx)),
    wechatCallback: tools.publicProcedure
      .input(parseWeChatCallbackInput)
      .mutation(({ ctx, input }) =>
        mapAuthServiceError(() => authService.completeWeChatLogin(input, ctx))
      ),
    wechatLoginConfig: tools.publicProcedure.query(() => authService.getWeChatLoginConfig()),
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
      .input(parseLoginInput)
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

function parseLoginInput(input: unknown): AdminLoginInput {
  if (!isRecord(input)) {
    throwInvalidInput();
  }

  if (typeof input.user !== 'string' || typeof input.password !== 'string') {
    throwInvalidInput();
  }

  const user = input.user.trim();

  if (!user || !input.password) {
    throwInvalidInput();
  }

  return {
    user,
    password: input.password,
  };
}

function parseWeChatCallbackInput(input: unknown): WeChatCallbackInput {
  if (!isRecord(input)) {
    throwInvalidWeChatCallbackInput();
  }

  if (typeof input.code !== 'string' || typeof input.state !== 'string') {
    throwInvalidWeChatCallbackInput();
  }

  const code = input.code.trim();
  const state = input.state.trim();

  if (!code || !state) {
    throwInvalidWeChatCallbackInput();
  }

  return { code, state };
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
    message: 'Admin login requires user and password',
  });
}

function throwInvalidWeChatCallbackInput(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'WeChat callback requires code and state',
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
