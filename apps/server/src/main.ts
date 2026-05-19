import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';
import { TrpcService } from './trpc/trpc.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({
    credentials: true,
    origin: ['http://localhost:3001', 'http://localhost:3002'],
  });
  app.get(TrpcService).registerTrpcPlugin(app);
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
