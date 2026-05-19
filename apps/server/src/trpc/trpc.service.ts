import { Injectable } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';

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
    private readonly commentsService: CommentsService
  ) {}

  registerTrpcPlugin(app: NestFastifyApplication): void {
    app
      .getHttpAdapter()
      .getInstance()
      .register(fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: {
          router: createAppRouter(
            this.authService,
            this.aiService,
            this.simulationsService,
            this.commentsService
          ),
          createContext: createTRPCContext,
        } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
      });
  }
}
