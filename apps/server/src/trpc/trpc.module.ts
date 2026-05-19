import { Module } from '@nestjs/common';

import { AiModule } from '../modules/ai/ai.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { TrpcService } from './trpc.service.js';

@Module({
  imports: [AuthModule, AiModule],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
