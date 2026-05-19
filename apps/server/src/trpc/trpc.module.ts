import { Module } from '@nestjs/common';

import { AuthModule } from '../modules/auth/auth.module.js';
import { TrpcService } from './trpc.service.js';

@Module({
  imports: [AuthModule],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
