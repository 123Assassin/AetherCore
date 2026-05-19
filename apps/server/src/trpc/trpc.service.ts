import { Injectable } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';

import { createTRPCContext } from './context.js';
import { appRouter, type AppRouter } from './router.js';

@Injectable()
export class TrpcService {
  registerTrpcPlugin(app: NestFastifyApplication): void {
    app
      .getHttpAdapter()
      .getInstance()
      .register(fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: {
          router: appRouter,
          createContext: createTRPCContext,
        } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
      });
  }
}
