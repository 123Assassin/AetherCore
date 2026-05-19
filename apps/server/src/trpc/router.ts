import { initTRPC } from '@trpc/server';

import type { AuthService } from '../modules/auth/auth.service.js';
import type { TRPCContext } from './context.js';
import { createAuthRouter, createAdminAuthRouter } from './routers/auth.router.js';
import { createMeRouter } from './routers/me.router.js';

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
});

export const createAppRouter = (authService: AuthService) =>
  createTRPCRouter({
    health: healthRouter,
    auth: createAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    adminAuth: createAdminAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    me: createMeRouter(authService, { createTRPCRouter, publicProcedure }),
  });

export type AppRouter = ReturnType<typeof createAppRouter>;
