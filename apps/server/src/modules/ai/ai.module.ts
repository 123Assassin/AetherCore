import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AiController } from './ai.controller.js';
import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiRepository, AiService],
  exports: [AiService],
})
export class AiModule {}
