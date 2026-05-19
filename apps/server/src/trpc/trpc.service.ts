import { Injectable } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';

import { AuthService } from '../modules/auth/auth.service.js';
import { createTRPCContext } from './context.js';
import { createAppRouter, type AppRouter } from './router.js';

@Injectable()
export class TrpcService {
  constructor(private readonly authService: AuthService) {}

  registerTrpcPlugin(app: NestFastifyApplication): void {
    app
      .getHttpAdapter()
      .getInstance()
      .register(fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: {
          router: createAppRouter(this.authService),
          createContext: createTRPCContext,
        } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
      });
  }
}
