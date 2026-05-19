import { initTRPC, type TRPCDefaultErrorShape } from '@trpc/server';

import {
  isAdminResourcesDomainErrorCode,
  type AdminResourcesDomainErrorCode,
  type AdminResourcesService,
} from '../modules/admin-resources/admin-resources.service.js';
import type { AiService } from '../modules/ai/ai.service.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { CommentsService } from '../modules/comments/comments.service.js';
import type { SimulationsService } from '../modules/simulations/simulations.service.js';
import type { TRPCContext } from './context.js';
import { createAdminResourcesRouter } from './routers/admin-resources.router.js';
import { createAiRouter } from './routers/ai.router.js';
import { createAuthRouter, createAdminAuthRouter } from './routers/auth.router.js';
import { createCommentsRouter } from './routers/comments.router.js';
import { createMeRouter } from './routers/me.router.js';
import {
  createAdminSimulationsRouter,
  createSimulationsRouter,
} from './routers/simulations.router.js';

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return formatTRPCErrorShape(shape, error.cause);
  },
});

type AdminResourcesErrorData = TRPCDefaultErrorShape['data'] & {
  domainCode?: AdminResourcesDomainErrorCode;
};

export function formatTRPCErrorShape(
  shape: TRPCDefaultErrorShape,
  cause: unknown
): TRPCDefaultErrorShape & { data: AdminResourcesErrorData } {
  const domainCode = getDomainCodeFromCause(cause);

  if (!domainCode) {
    return shape;
  }

  return {
    ...shape,
    data: {
      ...shape.data,
      domainCode,
    },
  };
}

function getDomainCodeFromCause(cause: unknown): AdminResourcesDomainErrorCode | undefined {
  if (typeof cause !== 'object' || cause === null || !('domainCode' in cause)) {
    return undefined;
  }

  const domainCode = cause.domainCode;

  return isAdminResourcesDomainErrorCode(domainCode) ? domainCode : undefined;
}

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
});

export const createAppRouter = (
  authService: AuthService,
  aiService: AiService,
  simulationsService: SimulationsService,
  commentsService: CommentsService,
  adminResourcesService: AdminResourcesService
) =>
  createTRPCRouter({
    health: healthRouter,
    auth: createAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    adminAuth: createAdminAuthRouter(authService, { createTRPCRouter, publicProcedure }),
    me: createMeRouter(authService, { createTRPCRouter, publicProcedure }),
    ai: createAiRouter(authService, aiService, { createTRPCRouter, publicProcedure }),
    comments: createCommentsRouter(authService, commentsService, {
      createTRPCRouter,
      publicProcedure,
    }),
    simulations: createSimulationsRouter(simulationsService, {
      createTRPCRouter,
      publicProcedure,
    }),
    adminSimulations: createAdminSimulationsRouter(authService, simulationsService, {
      createTRPCRouter,
      publicProcedure,
    }),
    adminResources: createAdminResourcesRouter(authService, adminResourcesService, {
      createTRPCRouter,
      publicProcedure,
    }),
  });

export type AppRouter = ReturnType<typeof createAppRouter>;
