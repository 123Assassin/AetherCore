import { TRPCError } from '@trpc/server';

import { resolveAdminSession } from '../../common/guards/admin-session.guard.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

type AdminLoginInput = {
  username: string;
  password: string;
};

export function createAuthRouter(authService: AuthService, tools: RouterTools) {
  return tools.createTRPCRouter({
    wechatLoginUrl: tools.publicProcedure.query(() => authService.getWeChatLoginUrl()),
    logout: tools.publicProcedure.mutation(({ ctx }) => authService.userLogout(ctx)),
  });
}

export function createAdminAuthRouter(authService: AuthService, tools: RouterTools) {
  return tools.createTRPCRouter({
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

function throwInvalidInput(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Admin login requires username and password',
  });
}
