import { TRPCError } from '@trpc/server';
import type {
  AdminAgentCreateInput,
  AdminAgentListInput,
  AdminAgentUpdateInput,
  AdminModelEngineCreateInput,
  AdminModelEngineUpdateInput,
  AdminPromptCreateInput,
  AdminPromptListInput,
  AdminPromptUpdateInput,
  AdminResourceDeleteInput,
  AdminSensitiveWordListCreateInput,
  AdminSensitiveWordListUpdateInput,
} from '../../modules/admin-resources/admin-resources.service.js';

import { requireAdminSession } from '../../common/guards/admin-session.guard.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import {
  AdminResourcesServiceError,
  type AdminResourcesService,
} from '../../modules/admin-resources/admin-resources.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

export function createAdminResourcesRouter(
  authService: AuthService,
  adminResourcesService: AdminResourcesService,
  tools: RouterTools
) {
  const adminProcedure = tools.publicProcedure.use(async ({ ctx, next }) => {
    await requireAdminSession(authService, ctx);

    return next();
  });

  return tools.createTRPCRouter({
    agents: tools.createTRPCRouter({
      list: adminProcedure.input(parseAgentListInput).query(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.listAgents(input));
      }),
      create: adminProcedure.input(parseAgentCreateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.createAgent(input));
      }),
      update: adminProcedure.input(parseAgentUpdateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.updateAgent(input));
      }),
      delete: adminProcedure.input(parseDeleteInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.deleteAgent(input));
      }),
    }),
    prompts: tools.createTRPCRouter({
      list: adminProcedure.input(parsePromptListInput).query(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.listPrompts(input));
      }),
      create: adminProcedure.input(parsePromptCreateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.createPrompt(input));
      }),
      update: adminProcedure.input(parsePromptUpdateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.updatePrompt(input));
      }),
      delete: adminProcedure.input(parseDeleteInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.deletePrompt(input));
      }),
    }),
    sensitiveWordLists: tools.createTRPCRouter({
      list: adminProcedure.query(async () => {
        return mapServiceError(() => adminResourcesService.listSensitiveWordLists());
      }),
      create: adminProcedure
        .input(parseSensitiveWordListCreateInput)
        .mutation(async ({ input }) => {
          return mapServiceError(() => adminResourcesService.createSensitiveWordList(input));
        }),
      update: adminProcedure
        .input(parseSensitiveWordListUpdateInput)
        .mutation(async ({ input }) => {
          return mapServiceError(() => adminResourcesService.updateSensitiveWordList(input));
        }),
      delete: adminProcedure.input(parseDeleteInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.deleteSensitiveWordList(input));
      }),
    }),
    engines: tools.createTRPCRouter({
      list: adminProcedure.query(async () => {
        return mapServiceError(() => adminResourcesService.listEngines());
      }),
      create: adminProcedure.input(parseEngineCreateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.createEngine(input));
      }),
      update: adminProcedure.input(parseEngineUpdateInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.updateEngine(input));
      }),
      delete: adminProcedure.input(parseDeleteInput).mutation(async ({ input }) => {
        return mapServiceError(() => adminResourcesService.deleteEngine(input));
      }),
    }),
  });
}

function parseAgentListInput(input: unknown): AdminAgentListInput {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('Admin agent list input must be an object');
  }

  return {
    ...parseOptionalStringProperty(input, 'q'),
    ...parseOptionalStringProperty(input, 'status'),
    ...parseOptionalStringProperty(input, 'engineId'),
    ...parseOptionalNumberProperty(input, 'page'),
    ...parseOptionalNumberProperty(input, 'pageSize'),
  } as AdminAgentListInput;
}

function parseAgentCreateInput(input: unknown): AdminAgentCreateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin agent create input must be an object');
  }

  return {
    key: parseRequiredString(
      input.key,
      'Admin agent create requires key'
    ) as AdminAgentCreateInput['key'],
    name: parseRequiredString(input.name, 'Admin agent create requires name'),
    engineId: parseRequiredString(input.engineId, 'Admin agent create requires engineId'),
    ...parseOptionalNullableStringProperty(input, 'promptId'),
    ...parseOptionalNullableStringProperty(input, 'sensitiveListId'),
    ...parseOptionalNumberProperty(input, 'temperature'),
    ...parseOptionalNumberProperty(input, 'topP'),
    ...parseOptionalNumberProperty(input, 'maxTokens'),
    ...parseOptionalStringProperty(input, 'status'),
  } as AdminAgentCreateInput;
}

function parseAgentUpdateInput(input: unknown): AdminAgentUpdateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin agent update input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin agent update requires id'),
    ...parseOptionalStringProperty(input, 'key'),
    ...parseOptionalStringProperty(input, 'name'),
    ...parseOptionalStringProperty(input, 'engineId'),
    ...parseOptionalNullableStringProperty(input, 'promptId'),
    ...parseOptionalNullableStringProperty(input, 'sensitiveListId'),
    ...parseOptionalNumberProperty(input, 'temperature'),
    ...parseOptionalNumberProperty(input, 'topP'),
    ...parseOptionalNumberProperty(input, 'maxTokens'),
    ...parseOptionalStringProperty(input, 'status'),
  } as AdminAgentUpdateInput;
}

function parsePromptListInput(input: unknown): AdminPromptListInput {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('Admin prompt list input must be an object');
  }

  return {
    ...parseOptionalStringProperty(input, 'q'),
    ...parseOptionalNumberProperty(input, 'page'),
    ...parseOptionalNumberProperty(input, 'pageSize'),
  };
}

function parsePromptCreateInput(input: unknown): AdminPromptCreateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin prompt create input must be an object');
  }

  return {
    title: parseRequiredString(input.title, 'Admin prompt create requires title'),
    version: parseRequiredString(input.version, 'Admin prompt create requires version'),
    content: parseRequiredString(input.content, 'Admin prompt create requires content'),
    ...parseOptionalNullableStringProperty(input, 'createdByAdminId'),
  };
}

function parsePromptUpdateInput(input: unknown): AdminPromptUpdateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin prompt update input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin prompt update requires id'),
    ...parseOptionalStringProperty(input, 'title'),
    ...parseOptionalStringProperty(input, 'version'),
    ...parseOptionalStringProperty(input, 'content'),
    ...parseOptionalNullableStringProperty(input, 'createdByAdminId'),
  };
}

function parseSensitiveWordListCreateInput(input: unknown): AdminSensitiveWordListCreateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin sensitive word list create input must be an object');
  }

  return {
    name: parseRequiredString(input.name, 'Admin sensitive word list create requires name'),
    words: parseRequiredStringArrayOrString(
      input.words,
      'Admin sensitive word list create requires words'
    ),
  };
}

function parseSensitiveWordListUpdateInput(input: unknown): AdminSensitiveWordListUpdateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin sensitive word list update input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin sensitive word list update requires id'),
    ...parseOptionalStringProperty(input, 'name'),
    ...parseOptionalStringArrayOrStringProperty(input, 'words'),
  };
}

function parseEngineCreateInput(input: unknown): AdminModelEngineCreateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin engine create input must be an object');
  }

  return {
    name: parseRequiredString(input.name, 'Admin engine create requires name'),
    provider: parseRequiredString(
      input.provider,
      'Admin engine create requires provider'
    ) as AdminModelEngineCreateInput['provider'],
    apiBaseUrl: parseRequiredString(input.apiBaseUrl, 'Admin engine create requires apiBaseUrl'),
    apiKey: parseRequiredString(input.apiKey, 'Admin engine create requires apiKey'),
    ...parseOptionalNullableStringProperty(input, 'modelName'),
    ...parseOptionalRecordProperty(input, 'pricing'),
    ...parseOptionalStringProperty(input, 'status'),
  } as AdminModelEngineCreateInput;
}

function parseEngineUpdateInput(input: unknown): AdminModelEngineUpdateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin engine update input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin engine update requires id'),
    ...parseOptionalStringProperty(input, 'name'),
    ...parseOptionalStringProperty(input, 'provider'),
    ...parseOptionalStringProperty(input, 'apiBaseUrl'),
    ...parseOptionalStringProperty(input, 'apiKey'),
    ...parseOptionalNullableStringProperty(input, 'modelName'),
    ...parseOptionalRecordProperty(input, 'pricing'),
    ...parseOptionalStringProperty(input, 'status'),
  } as AdminModelEngineUpdateInput;
}

function parseDeleteInput(input: unknown): AdminResourceDeleteInput {
  if (!isRecord(input)) {
    throwInvalidInput('Admin resource delete input must be an object');
  }

  return {
    id: parseRequiredString(input.id, 'Admin resource delete requires id'),
  };
}

async function mapServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof AdminResourcesServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
        cause: { domainCode: error.domainCode },
      });
    }

    throw error;
  }
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
    throwInvalidInput(`Admin resource ${field} must be a string`);
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

  throwInvalidInput(`Admin resource ${field} must be a string or null`);
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
    throwInvalidInput(`Admin resource ${field} must be a number`);
  }

  return { [field]: value };
}

function parseOptionalRecordProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, Record<string, unknown> | null> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  if (value === null || isRecord(value)) {
    return { [field]: value };
  }

  throwInvalidInput(`Admin resource ${field} must be an object or null`);
}

function parseOptionalStringArrayOrStringProperty(
  input: Record<string, unknown>,
  field: string
): Record<string, string[] | string> {
  const value = input[field];

  if (value === undefined) {
    return {};
  }

  return {
    [field]: parseRequiredStringArrayOrString(value, `Admin resource ${field} is required`),
  };
}

function parseRequiredStringArrayOrString(value: unknown, message: string): string[] | string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }

  throwInvalidInput(message);
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
