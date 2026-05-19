import { Module } from '@nestjs/common';

import { TrpcModule } from './trpc/trpc.module.js';

@Module({
  imports: [TrpcModule],
})
export class AppModule {}
