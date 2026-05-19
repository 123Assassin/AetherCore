import { Module } from '@nestjs/common';

import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';

@Module({
  providers: [AiRepository, AiService],
  exports: [AiService],
})
export class AiModule {}
