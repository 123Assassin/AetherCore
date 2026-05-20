import { Module } from '@nestjs/common';

import { AdminOperationsRepository } from './admin-operations.repository.js';
import { AdminOperationsService } from './admin-operations.service.js';

@Module({
  providers: [AdminOperationsRepository, AdminOperationsService],
  exports: [AdminOperationsService],
})
export class AdminOperationsModule {}
