import { Injectable } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';

import { AdminOperationsService } from '../modules/admin-operations/admin-operations.service.js';
import { AdminResourcesService } from '../modules/admin-resources/admin-resources.service.js';
import { AiService } from '../modules/ai/ai.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { CommentsService } from '../modules/comments/comments.service.js';
import { SimulationsService } from '../modules/simulations/simulations.service.js';
import { createTRPCContext } from './context.js';
import { createAppRouter, type AppRouter } from './router.js';

@Injectable()
export class TrpcService {
  constructor(
    private readonly authService: AuthService,
    private readonly aiService: AiService,
    private readonly simulationsService: SimulationsService,
    private readonly commentsService: CommentsService,
    private readonly adminResourcesService: AdminResourcesService,
    private readonly adminOperationsService: AdminOperationsService
  ) {}

  registerTrpcPlugin(app: NestFastifyApplication): void {
    const fastify = app.getHttpAdapter().getInstance();

    fastify.get('/trpc', async () => ({ status: 'ok' }));
    fastify.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: {
        router: createAppRouter(
          this.authService,
          this.aiService,
          this.simulationsService,
          this.commentsService,
          this.adminResourcesService,
          this.adminOperationsService
        ),
        createContext: createTRPCContext,
      } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
    });
  }
}
