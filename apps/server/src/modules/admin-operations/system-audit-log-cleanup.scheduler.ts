import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  AdminOperationsService,
  type AdminOperationsAuditContext,
  type AdminSystemAuditCleanupResult,
} from './admin-operations.service.js';

export type DailyAuditCleanupCron = {
  expression: string;
  hour: number;
  minute: number;
};

export const SYSTEM_AUDIT_LOG_CLEANUP_CRON_ENV = 'SYSTEM_AUDIT_LOG_CLEANUP_CRON';
export const DEFAULT_SYSTEM_AUDIT_LOG_CLEANUP_CRON = '0 3 * * *';

const SYSTEM_AUDIT_CLEANUP_CONTEXT = {
  actorId: 'system',
  userAgent: 'system-audit-log-cleanup-scheduler',
} satisfies AdminOperationsAuditContext;

@Injectable()
export class SystemAuditLogCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemAuditLogCleanupScheduler.name);
  private running = false;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  onModuleInit(): void {
    this.stopped = false;
    this.scheduleNextRun(new Date());
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.clearTimer();
  }

  async runCleanupOnce(): Promise<AdminSystemAuditCleanupResult> {
    return this.adminOperationsService.cleanupSystemAuditLogsByRetention(
      SYSTEM_AUDIT_CLEANUP_CONTEXT
    );
  }

  private scheduleNextRun(from: Date): void {
    if (this.stopped) {
      return;
    }

    this.clearTimer();

    const schedule = this.readSchedule();
    const nextRunAt = getNextDailyCronRunAt(schedule, from);
    const delayMs = Math.max(nextRunAt.getTime() - from.getTime(), 0);

    this.timer = setTimeout(() => {
      void this.runScheduledCleanup();
    }, delayMs);
    this.logger.log(
      `System audit log cleanup scheduled at ${nextRunAt.toISOString()} by cron "${schedule.expression}"`
    );
  }

  private async runScheduledCleanup(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const result = await this.runCleanupOnce();
      this.logger.log(
        `System audit log cleanup completed, deleted ${result.deletedCount} log(s), retention ${result.retentionDays ?? 'unknown'} day(s)`
      );
    } catch (error) {
      this.logger.error(
        'System audit log cleanup failed',
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      this.running = false;
      this.scheduleNextRun(new Date());
    }
  }

  private readSchedule(): DailyAuditCleanupCron {
    const expression =
      process.env[SYSTEM_AUDIT_LOG_CLEANUP_CRON_ENV]?.trim() ||
      DEFAULT_SYSTEM_AUDIT_LOG_CLEANUP_CRON;

    try {
      return parseDailyAuditCleanupCron(expression);
    } catch {
      this.logger.warn(
        `Invalid ${SYSTEM_AUDIT_LOG_CLEANUP_CRON_ENV}="${expression}", falling back to "${DEFAULT_SYSTEM_AUDIT_LOG_CLEANUP_CRON}"`
      );

      return parseDailyAuditCleanupCron(DEFAULT_SYSTEM_AUDIT_LOG_CLEANUP_CRON);
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export function parseDailyAuditCleanupCron(expression: string): DailyAuditCleanupCron {
  const normalized = expression.trim().replace(/\s+/g, ' ');
  const [minuteText, hourText, dayOfMonth, month, dayOfWeek, extra] = normalized.split(' ');

  if (
    extra !== undefined ||
    minuteText === undefined ||
    hourText === undefined ||
    dayOfMonth !== '*' ||
    month !== '*' ||
    dayOfWeek !== '*'
  ) {
    throw new Error('System audit cleanup cron must be in "minute hour * * *" format');
  }

  const minute = parseCronNumber(minuteText, 0, 59, 'minute');
  const hour = parseCronNumber(hourText, 0, 23, 'hour');

  return {
    expression: normalized,
    hour,
    minute,
  };
}

export function getNextDailyCronRunAt(schedule: DailyAuditCleanupCron, from: Date): Date {
  const nextRunAt = new Date(from);

  nextRunAt.setHours(schedule.hour, schedule.minute, 0, 0);

  if (nextRunAt.getTime() <= from.getTime()) {
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  }

  return nextRunAt;
}

function parseCronNumber(value: string, min: number, max: number, field: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`System audit cleanup cron ${field} must be a number`);
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`System audit cleanup cron ${field} is out of range`);
  }

  return number;
}
