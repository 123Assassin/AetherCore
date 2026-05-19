import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module.js';
import { TrpcModule } from './trpc/trpc.module.js';

@Module({
  imports: [AuthModule, TrpcModule],
})
export class AppModule {}
