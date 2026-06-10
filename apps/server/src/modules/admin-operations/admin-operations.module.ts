import { Module } from '@nestjs/common';

import { AdminOperationsRepository } from './admin-operations.repository.js';
import { AdminOperationsService } from './admin-operations.service.js';
import { SystemAuditLogCleanupScheduler } from './system-audit-log-cleanup.scheduler.js';

@Module({
  providers: [AdminOperationsRepository, AdminOperationsService, SystemAuditLogCleanupScheduler],
  exports: [AdminOperationsService],
})
export class AdminOperationsModule {}
