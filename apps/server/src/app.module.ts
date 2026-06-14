import { Module } from '@nestjs/common';

import { AdminOperationsModule } from './modules/admin-operations/admin-operations.module.js';
import { AdminResourcesModule } from './modules/admin-resources/admin-resources.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { SimulationsModule } from './modules/simulations/simulations.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { TrpcModule } from './trpc/trpc.module.js';

@Module({
  imports: [
    AuthModule,
    AiModule,
    SimulationsModule,
    CommentsModule,
    UploadsModule,
    AdminResourcesModule,
    AdminOperationsModule,
    TrpcModule,
  ],
})
export class AppModule {}
