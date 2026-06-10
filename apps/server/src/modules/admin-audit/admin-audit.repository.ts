import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db, systemAuditLogs } from '@package/db';

import type { AdminAuditLogSaveData } from './admin-audit.service.js';

@Injectable()
export class AdminAuditRepository {
  private readonly database: Database = db;

  async createSystemAuditLog(input: AdminAuditLogSaveData): Promise<void> {
    await this.database.insert(systemAuditLogs).values(input);
  }
}
