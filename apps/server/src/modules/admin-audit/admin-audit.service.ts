import { Injectable } from '@nestjs/common';

import { AdminAuditRepository } from './admin-audit.repository.js';

export type AdminAuditLevel = 0 | 1;
export type AdminAuditLogType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type AdminAuditRequestType = 'query' | 'mutation' | 'subscription';

export type AdminAuditRequestResult =
  | {
      data: unknown;
      success: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      success: false;
    };

export type AdminAuditDetails = {
  actorAccount: string;
  actorId: string;
  apiRoute: string;
  ip: string | null;
  module: string;
  requestParams: unknown;
  requestResult: AdminAuditRequestResult;
  requestType: AdminAuditRequestType;
  userAgent: string | null;
};

export type AdminAuditLogSaveData = {
  details: AdminAuditDetails;
  level: AdminAuditLevel;
  logType: AdminAuditLogType;
  timestamp: number;
};

export type AdminAuditRequestInput = {
  actorAccount: string;
  actorId: string;
  input: unknown;
  ip: string | null;
  path: string;
  result: AdminAuditRequestResult;
  type: AdminAuditRequestType;
  userAgent: string | null;
};

type AdminAuditModuleDefinition = {
  label: string;
  type: AdminAuditLogType;
};

const DEFAULT_MODULE = {
  label: '系统设置',
  type: 2,
} as const satisfies AdminAuditModuleDefinition;

const MODULES = {
  systemAdmins: { label: '系统管理员管理', type: 0 },
  users: { label: '用户管理', type: 1 },
  systemSettings: { label: '系统设置', type: 2 },
  agents: { label: '智能体管理', type: 3 },
  prompts: { label: 'AI Prompt管理', type: 4 },
  sensitiveWordLists: { label: '敏感词库管理', type: 5 },
  simulations: { label: '仿真案例库管理', type: 6 },
  engines: { label: '引擎调度中心', type: 7 },
  activities: { label: '活动管理', type: 8 },
  fission: { label: '裂变管理', type: 9 },
  systemAudit: { label: '系统审计日志', type: 10 },
  contentAudit: { label: 'AI内容审计', type: 11 },
  trafficStats: { label: '流量监控', type: 12 },
  alarmConfig: { label: '消息告警中心', type: 13 },
} as const satisfies Record<string, AdminAuditModuleDefinition>;

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /password|secret|token|api[_-]?key|authorization/i;

@Injectable()
export class AdminAuditService {
  constructor(private readonly adminAuditRepository: AdminAuditRepository) {}

  async recordAdminApiRequest(input: AdminAuditRequestInput): Promise<void> {
    const module = resolveAuditModule(input.path, input.input, input.result);

    await this.adminAuditRepository.createSystemAuditLog({
      details: {
        actorAccount: input.actorAccount,
        actorId: input.actorId,
        apiRoute: input.path,
        module: module.label,
        requestParams: sanitizeAuditValue(input.input),
        requestResult: sanitizeAuditValue(input.result) as AdminAuditRequestResult,
        requestType: input.type,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      level: input.type === 'query' ? 1 : 0,
      logType: module.type,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }
}

function resolveAuditModule(
  path: string,
  input: unknown,
  result: AdminAuditRequestResult
): AdminAuditModuleDefinition {
  const normalizedPath = stripKnownRouterPrefix(path);

  if (normalizedPath.startsWith('users.')) {
    return isSystemAdminUserOperation(normalizedPath, input, result)
      ? MODULES.systemAdmins
      : MODULES.users;
  }
  if (normalizedPath.startsWith('systemConfig.') || normalizedPath.startsWith('adminAuth.')) {
    return MODULES.systemSettings;
  }
  if (normalizedPath.startsWith('agents.')) {
    return MODULES.agents;
  }
  if (normalizedPath.startsWith('prompts.')) {
    return MODULES.prompts;
  }
  if (normalizedPath.startsWith('sensitiveWordLists.')) {
    return MODULES.sensitiveWordLists;
  }
  if (normalizedPath.startsWith('adminSimulations.') || normalizedPath.startsWith('simulations.')) {
    return MODULES.simulations;
  }
  if (normalizedPath.startsWith('engines.')) {
    return MODULES.engines;
  }
  if (normalizedPath.startsWith('activities.')) {
    return MODULES.activities;
  }
  if (normalizedPath.startsWith('fission.')) {
    return MODULES.fission;
  }
  if (normalizedPath.startsWith('systemAudit.')) {
    return MODULES.systemAudit;
  }
  if (normalizedPath.startsWith('contentAudit.')) {
    return MODULES.contentAudit;
  }
  if (normalizedPath.startsWith('trafficStats.')) {
    return MODULES.trafficStats;
  }
  if (normalizedPath.startsWith('alarmConfig.')) {
    return MODULES.alarmConfig;
  }

  return DEFAULT_MODULE;
}

function stripKnownRouterPrefix(path: string): string {
  for (const prefix of ['adminOperations.', 'adminResources.']) {
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }
  }

  return path;
}

function isSystemAdminUserOperation(
  path: string,
  input: unknown,
  result: AdminAuditRequestResult
): boolean {
  if (path === 'users.createAdmin') {
    return true;
  }

  const values = [input, result.success ? result.data : null];

  return values.some(hasAdminRole);
}

function hasAdminRole(value: unknown): boolean {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      return value.some(hasAdminRole);
    }

    return false;
  }

  if (value.role === 'admin') {
    return true;
  }

  return Object.values(value).some(hasAdminRole);
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeAuditValue(item),
    ])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
