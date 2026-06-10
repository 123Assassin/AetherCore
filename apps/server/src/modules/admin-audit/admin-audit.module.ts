import { Module } from '@nestjs/common';

import { AdminAuditRepository } from './admin-audit.repository.js';
import { AdminAuditService } from './admin-audit.service.js';

@Module({
  providers: [AdminAuditRepository, AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}
