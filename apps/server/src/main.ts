import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

import { AppModule } from './app.module.js';
import { TrpcService } from './trpc/trpc.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 7001);
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    credentials: true,
    origin: origins,
  });
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.FILE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024),
      files: 1,
    },
    throwFileSizeLimit: true,
  });
  app.get(TrpcService).registerTrpcPlugin(app);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
