import { initTRPC } from '@trpc/server';

import type { TRPCContext } from './context.js';

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
});

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
