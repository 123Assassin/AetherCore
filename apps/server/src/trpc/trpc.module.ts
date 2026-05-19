import { Module } from '@nestjs/common';

import { AdminResourcesModule } from '../modules/admin-resources/admin-resources.module.js';
import { AiModule } from '../modules/ai/ai.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { CommentsModule } from '../modules/comments/comments.module.js';
import { SimulationsModule } from '../modules/simulations/simulations.module.js';
import { TrpcService } from './trpc.service.js';

@Module({
  imports: [AuthModule, AiModule, SimulationsModule, CommentsModule, AdminResourcesModule],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
