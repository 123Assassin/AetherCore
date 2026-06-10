import { TRPCError } from '@trpc/server';

import type { AdminAuditService } from '../../modules/admin-audit/admin-audit.service.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import {
  SimulationsServiceError,
  type SimulationsService,
} from '../../modules/simulations/simulations.service.js';
import { createAuditedAdminProcedure } from '../admin-audit-middleware.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  adminAuditService?: AdminAuditService | undefined;
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

export function createSimulationsRouter(
  simulationsService: SimulationsService,
  tools: RouterTools
) {
  return tools.createTRPCRouter({
    list: tools.publicProcedure
      .input(parseSimulationListInput)
      .query(({ input }) => mapServiceError(() => simulationsService.listPublic(input))),
    filters: tools.publicProcedure.query(() =>
      mapServiceError(() => simulationsService.filters({ enabledOnly: true }))
    ),
  });
}

export function createAdminSimulationsRouter(
  authService: AuthService,
  simulationsService: SimulationsService,
  tools: RouterTools
) {
  const adminProcedure = createAuditedAdminProcedure({
    adminAuditService: tools.adminAuditService,
    authService,
    pathPrefix: 'adminSimulations',
    publicProcedure: tools.publicProcedure,
  });

  return tools.createTRPCRouter({
    list: adminProcedure.input(parseAdminSimulationListInput).query(async ({ input }) => {
      return mapServiceError(() => simulationsService.listAdmin(input));
    }),
    filters: adminProcedure.query(async () => {
      return mapServiceError(() => simulationsService.filters({ enabledOnly: false }));
    }),
    setEnabled: adminProcedure.input(parseSetEnabledInput).mutation(async ({ input }) => {
      return mapServiceError(() => simulationsService.setEnabled(input));
    }),
    update: adminProcedure.input(parseUpdateInput).mutation(async ({ input }) => {
      return mapServiceError(() => simulationsService.update(input));
    }),
  });
}

function parseSimulationListInput(input: unknown): {
  subjects?: string[];
  categoryIds?: string[];
  grades?: string[];
  q?: string;
  page?: number;
  pageSize?: number;
} {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('Simulation list input must be an object');
  }

  return {
    ...parseCommonListInput(input),
  };
}

function parseAdminSimulationListInput(input: unknown): {
  subjects?: string[];
  categoryIds?: string[];
  grades?: string[];
  q?: string;
  page?: number;
  pageSize?: number;
  isable?: boolean;
} {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('Admin simulation list input must be an object');
  }

  return {
    ...parseCommonListInput(input),
    ...parseOptionalBooleanProperty(input, 'isable'),
  };
}

function parseSetEnabledInput(input: unknown): { id: string; isable: boolean } {
  if (!isRecord(input)) {
    throwInvalidInput('Admin simulation setEnabled input must be an object');
  }

  if (typeof input.isable !== 'boolean') {
    throwInvalidInput('Admin simulation setEnabled requires isable');
  }

  return {
    id: parseRequiredString(input.id, 'Admin simulation setEnabled requires id'),
    isable: input.isable,
  };
}

function parseUpdateInput(input: unknown): {
  id: string;
  name?: string;
  categoryId?: string;
  grades?: string[];
  thumbnail?: string | null;
  src?: string | null;
  isable?: boolean;
  topics?: unknown[] | null;
  sampleLearningGoals?: unknown[] | null;
} {
  if (!isRecord(input)) {
    throwInvalidInput('Admin simulation update input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin simulation update requires id'),
    ...parseOptionalStringProperty(input, 'name'),
    ...parseOptionalStringProperty(input, 'categoryId'),
    ...parseOptionalStringArrayProperty(input, 'grades'),
    ...parseOptionalNullableStringProperty(input, 'thumbnail'),
    ...parseOptionalNullableStringProperty(input, 'src'),
    ...parseOptionalBooleanProperty(input, 'isable'),
    ...parseOptionalArrayProperty(input, 'topics'),
    ...parseOptionalArrayProperty(input, 'sampleLearningGoals'),
  };
}

function parseCommonListInput(input: Record<string, unknown>): {
  subjects?: string[];
  categoryIds?: string[];
  grades?: string[];
  q?: string;
  page?: number;
  pageSize?: number;
} {
  return {
    ...parseOptionalStringArrayProperty(input, 'subjects'),
    ...parseOptionalStringArrayProperty(input, 'categoryIds'),
    ...parseOptionalStringArrayProperty(input, 'grades'),
    ...parseOptionalStringProperty(input, 'q'),
    ...parseOptionalNumberProperty(input, 'page'),
    ...parseOptionalNumberProperty(input, 'pageSize'),
  };
}

async function mapServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof SimulationsServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
      });
    }

    throw error;
  }
}

function parseOptionalStringArrayProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string[]> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (typeof value === 'string') {
    return { [field]: value.split(',') };
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return { [field]: value };
  }

  throwInvalidInput(`Simulation ${field} must be a string or string array`);
}

function parseOptionalStringProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'string') {
    throwInvalidInput(`Simulation ${field} must be a string`);
  }

  return { [field]: value };
}

function parseOptionalNullableStringProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string | null> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (value === null || typeof value === 'string') {
    return { [field]: value };
  }

  throwInvalidInput(`Simulation ${field} must be a string or null`);
}

function parseOptionalBooleanProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, boolean> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'boolean') {
    throwInvalidInput(`Simulation ${field} must be a boolean`);
  }

  return { [field]: value };
}

function parseOptionalArrayProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, unknown[] | null> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (value === null || Array.isArray(value)) {
    return { [field]: value };
  }

  throwInvalidInput(`Simulation ${field} must be an array or null`);
}

function parseOptionalNumberProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, number> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwInvalidInput(`Simulation ${field} must be a number`);
  }

  return { [field]: value };
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidInput(message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwInvalidInput(message: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message,
  });
}
