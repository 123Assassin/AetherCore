import { initTRPC } from '@trpc/server';

import type { AiService } from '../modules/ai/ai.service.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { SimulationsService } from '../modules/simulations/simulations.service.js';
import type { TRPCContext } from './context.js';
import { createAiRouter } from './routers/ai.router.js';
import { createAuthRouter, createAdminAuthRouter } from './routers/auth.router.js';
import { createMeRouter } from './routers/me.router.js';
import {
  createAdminSimulationsRouter,
  createSimulationsRouter,
} from './routers/simulations.router.js';

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
});

export const createAppRouter = (
  authService: AuthService,
  aiService: AiService,
  simulationsService: SimulationsService
) =>
  createTRPCRouter({
    health: healthRouter,
    auth: createAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    adminAuth: createAdminAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    me: createMeRouter(authService, { createTRPCRouter, publicProcedure }),
    ai: createAiRouter(authService, aiService, { createTRPCRouter, publicProcedure }),
    simulations: createSimulationsRouter(simulationsService, {
      createTRPCRouter,
      publicProcedure,
    }),
    adminSimulations: createAdminSimulationsRouter(authService, simulationsService, {
      createTRPCRouter,
      publicProcedure,
    }),
  });

export type AppRouter = ReturnType<typeof createAppRouter>;
