import { Module } from '@nestjs/common';

import { TrpcService } from './trpc.service.js';

@Module({
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
