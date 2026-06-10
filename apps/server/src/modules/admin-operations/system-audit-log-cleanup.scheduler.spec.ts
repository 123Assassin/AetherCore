import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getNextDailyCronRunAt,
  parseDailyAuditCleanupCron,
  SystemAuditLogCleanupScheduler,
} from './system-audit-log-cleanup.scheduler.js';

test('audit cleanup cron parser accepts daily 03:00 config', () => {
  assert.deepEqual(parseDailyAuditCleanupCron('0 3 * * *'), {
    expression: '0 3 * * *',
    hour: 3,
    minute: 0,
  });
});

test('audit cleanup cron computes the next local daily run time', () => {
  const schedule = parseDailyAuditCleanupCron('0 3 * * *');

  assert.equal(
    getNextDailyCronRunAt(schedule, new Date('2026-06-10T02:59:00')).toISOString(),
    new Date('2026-06-10T03:00:00').toISOString()
  );
  assert.equal(
    getNextDailyCronRunAt(schedule, new Date('2026-06-10T03:00:00')).toISOString(),
    new Date('2026-06-11T03:00:00').toISOString()
  );
});

test('audit cleanup scheduler runs retention cleanup as a system task', async () => {
  const service = new FakeAdminOperationsService();
  const scheduler = new SystemAuditLogCleanupScheduler(service.asService());

  const result = await scheduler.runCleanupOnce();

  assert.deepEqual(result, { deletedCount: 2, retentionDays: 30 });
  assert.deepEqual(service.lastCleanupContext, {
    actorId: 'system',
    userAgent: 'system-audit-log-cleanup-scheduler',
  });
});

class FakeAdminOperationsService {
  lastCleanupContext: unknown = null;

  asService() {
    return this as never;
  }

  async cleanupSystemAuditLogsByRetention(context: unknown) {
    this.lastCleanupContext = context;

    return { deletedCount: 2, retentionDays: 30 };
  }
}
