import { Injectable } from '@nestjs/common';
import {
  adminAgentKeys,
  getAdminAgentClassificationMode,
  getAdminAgentGradeOptions,
  type AdminAgentKey,
} from '@package/shared';

import {
  AdminResourcesRepository,
  type AdminAgentRepositoryRow,
  type AdminAgentSaveData,
  type AdminEngineRepositoryRow,
  type AdminEngineSaveData,
  type AdminPromptRepositoryRow,
  type AdminPromptSaveData,
  type AdminSensitiveWordListRepositoryRow,
  type AdminSensitiveWordListSaveData,
} from './admin-resources.repository.js';
import {
  decryptEngineApiKey,
  encryptEngineApiKey,
  EngineApiKeyCryptoError,
  maskEngineApiKey,
} from './engine-api-key.crypto.js';

export type { AdminAgentKey } from '@package/shared';
export type AdminResourceStatus = 'enabled' | 'disabled';
export type AdminModelEngineProvider = 'openai' | 'gemini' | 'custom';

export type AdminResourceListInput = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type AdminResourceListResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminAgentItem = {
  id: string;
  key: AdminAgentKey;
  grade: string | null;
  subject: string | null;
  name: string;
  engineId: string;
  promptId: string | null;
  sensitiveListId: string | null;
  temperature: number;
  topP: number;
  maxTokens: number;
  status: AdminResourceStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminAgentListInput = AdminResourceListInput & {
  status?: AdminResourceStatus;
  engineId?: string;
  grade?: string;
  subject?: string;
};

export type AdminAgentCreateInput = {
  key: AdminAgentKey;
  grade?: string | null;
  subject?: string | null;
  name: string;
  engineId: string;
  promptId?: string | null;
  sensitiveListId?: string | null;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  status?: AdminResourceStatus;
};

export type AdminAgentUpdateInput = Partial<AdminAgentCreateInput> & {
  id: string;
};

export type AdminPromptItem = {
  id: string;
  title: string;
  version: string;
  content: string;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPromptListInput = AdminResourceListInput;

export type AdminPromptCreateInput = {
  title: string;
  version: string;
  content: string;
  createdByAdminId?: string | null;
};

export type AdminPromptUpdateInput = Partial<AdminPromptCreateInput> & {
  id: string;
};

export type AdminSensitiveWordListItem = {
  id: string;
  name: string;
  words: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSensitiveWordListCreateInput = {
  name: string;
  words: string[] | string;
};

export type AdminSensitiveWordListUpdateInput = Partial<AdminSensitiveWordListCreateInput> & {
  id: string;
};

export type AdminModelEngineItem = {
  id: string;
  name: string;
  provider: AdminModelEngineProvider;
  apiBaseUrl: string;
  apiKeyMasked: string;
  modelName: string | null;
  pricing: Record<string, unknown> | null;
  status: AdminResourceStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminModelEngineCreateInput = {
  name: string;
  provider?: AdminModelEngineProvider;
  apiBaseUrl: string;
  apiKey: string;
  modelName?: string | null;
  pricing?: Record<string, unknown> | null;
  status?: AdminResourceStatus;
};

export type AdminModelEngineUpdateInput = Partial<AdminModelEngineCreateInput> & {
  id: string;
};

export type AdminResourceDeleteInput = {
  id: string;
};

export type AdminResourcesErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT';

export type AdminResourcesDomainErrorCode =
  | AdminResourcesErrorCode
  | 'AGENT_KEY_EXISTS'
  | 'DUPLICATE_PROMPT'
  | 'DUPLICATE_ENGINE_NAME'
  | 'DUPLICATE_SENSITIVE_WORD_LIST_NAME'
  | 'RESOURCE_IN_USE';

const ADMIN_RESOURCES_DOMAIN_ERROR_CODES = [
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'AGENT_KEY_EXISTS',
  'DUPLICATE_PROMPT',
  'DUPLICATE_ENGINE_NAME',
  'DUPLICATE_SENSITIVE_WORD_LIST_NAME',
  'RESOURCE_IN_USE',
] as const satisfies readonly AdminResourcesDomainErrorCode[];

const ADMIN_RESOURCES_DOMAIN_ERROR_CODE_SET = new Set<string>(ADMIN_RESOURCES_DOMAIN_ERROR_CODES);

export class AdminResourcesServiceError extends Error {
  constructor(
    public readonly code: AdminResourcesErrorCode,
    message: string,
    public readonly domainCode: AdminResourcesDomainErrorCode = code
  ) {
    super(message);
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_AGENT_TEMPERATURE = 0.7;
const DEFAULT_AGENT_TOP_P = 0.9;
const DEFAULT_AGENT_MAX_TOKENS = 2000;
const DEFAULT_STATUS = 'enabled';
const DEFAULT_MODEL_ENGINE_PROVIDER = 'custom';
const ADMIN_AGENT_KEYS = adminAgentKeys;
const ADMIN_MODEL_ENGINE_PROVIDERS = ['openai', 'gemini', 'custom'] as const;
const ADMIN_RESOURCE_STATUSES = ['enabled', 'disabled'] as const;
const AGENT_KEY_UNIQUE_CONSTRAINTS = ['ai_agents_key_unique', 'uniq_ai_agents_key_grade_subject'];
const ENGINE_NAME_UNIQUE_CONSTRAINTS = ['model_engines_name_unique'];
const PROMPT_TITLE_VERSION_UNIQUE_CONSTRAINTS = ['uniq_prompt_title_version'];
const SENSITIVE_WORD_LIST_NAME_UNIQUE_CONSTRAINTS = ['sensitive_word_lists_name_unique'];

type NormalizedPageInput = {
  page: number;
  pageSize: number;
};

@Injectable()
export class AdminResourcesService {
  constructor(private readonly adminResourcesRepository: AdminResourcesRepository) {}

  async listAgents(
    input: AdminAgentListInput = {}
  ): Promise<AdminResourceListResult<AdminAgentItem>> {
    const pageInput = normalizePageInput(input);
    let rows = await this.adminResourcesRepository.listAgents();
    const q = trimOptional(input.q)?.toLowerCase();
    const engineId = trimOptional(input.engineId);
    const grade = trimOptional(input.grade);
    const subject = trimOptional(input.subject);
    const status = normalizeOptionalStatus(input.status);

    if (q) {
      rows = rows.filter((row) =>
        `${row.key} ${row.grade ?? ''} ${row.subject ?? ''} ${row.name}`.toLowerCase().includes(q)
      );
    }
    if (engineId) {
      rows = rows.filter((row) => row.engineId === engineId);
    }
    if (grade) {
      rows = rows.filter((row) => row.grade === grade);
    }
    if (subject) {
      rows = rows.filter((row) => row.subject === subject);
    }
    if (status) {
      rows = rows.filter((row) => row.status === status);
    }

    return toListResult(rows, pageInput, toAgentItem);
  }

  async createAgent(input: AdminAgentCreateInput): Promise<AdminAgentItem> {
    const data = normalizeAgentCreateInput(input);
    await this.validateAgentReferences(data);
    await this.ensureAgentConfigAvailable(data.key, data.grade, data.subject);

    return toAgentItem(
      await mapUniqueConstraintError(
        () => this.adminResourcesRepository.createAgent(data),
        'Agent key and category already exists',
        'AGENT_KEY_EXISTS',
        AGENT_KEY_UNIQUE_CONSTRAINTS
      )
    );
  }

  async updateAgent(input: AdminAgentUpdateInput): Promise<AdminAgentItem> {
    const id = requireTrimmedMax(input.id, 'Agent id', 100, 'Agent id is required');
    const existing = await this.adminResourcesRepository.findAgentById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Agent not found');
    }

    const data = normalizeAgentUpdateInput(input);

    if (data.key !== undefined) {
      if (data.key !== existing.key) {
        throw new AdminResourcesServiceError('BAD_REQUEST', 'Agent key cannot be changed');
      }

      delete data.key;
    }

    if (Object.keys(data).length === 0) {
      throw new AdminResourcesServiceError('BAD_REQUEST', 'Agent update has no changes');
    }

    await this.validateAgentReferences({
      key: data.key ?? existing.key,
      grade: data.grade === undefined ? existing.grade : data.grade,
      subject: data.subject === undefined ? existing.subject : data.subject,
      name: data.name ?? existing.name,
      engineId: data.engineId ?? existing.engineId,
      promptId: data.promptId === undefined ? existing.promptId : data.promptId,
      sensitiveListId:
        data.sensitiveListId === undefined ? existing.sensitiveListId : data.sensitiveListId,
      temperature: data.temperature ?? existing.temperature,
      topP: data.topP ?? existing.topP,
      maxTokens: data.maxTokens ?? existing.maxTokens,
      status: data.status ?? existing.status,
    });

    const nextKey = data.key ?? existing.key;
    const nextGrade = data.grade === undefined ? existing.grade : data.grade;
    const nextSubject = data.subject === undefined ? existing.subject : data.subject;

    if (
      nextKey !== existing.key ||
      nextGrade !== existing.grade ||
      nextSubject !== existing.subject
    ) {
      await this.ensureAgentConfigAvailable(nextKey, nextGrade, nextSubject, id);
    }

    const updated = await mapUniqueConstraintError(
      () => this.adminResourcesRepository.updateAgent({ id, ...data }),
      'Agent key and category already exists',
      'AGENT_KEY_EXISTS',
      AGENT_KEY_UNIQUE_CONSTRAINTS
    );

    if (!updated) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Agent not found');
    }

    return toAgentItem(updated);
  }

  async deleteAgent(input: AdminResourceDeleteInput): Promise<{ id: string }> {
    const id = requireTrimmedMax(input.id, 'Agent id', 100, 'Agent id is required');
    const deleted = await this.adminResourcesRepository.softDeleteAgent(id);

    if (!deleted) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Agent not found');
    }

    return { id };
  }

  async listPrompts(
    input: AdminPromptListInput = {}
  ): Promise<AdminResourceListResult<AdminPromptItem>> {
    const pageInput = normalizePageInput(input);
    let rows = await this.adminResourcesRepository.listPrompts();
    const q = trimOptional(input.q)?.toLowerCase();

    if (q) {
      rows = rows.filter((row) =>
        `${row.title} ${row.version} ${row.content}`.toLowerCase().includes(q)
      );
    }

    return toListResult(rows, pageInput, toPromptItem);
  }

  async createPrompt(input: AdminPromptCreateInput): Promise<AdminPromptItem> {
    const data = normalizePromptCreateInput(input);
    await this.ensurePromptTitleVersionAvailable(data.title, data.version);

    return toPromptItem(
      await mapUniqueConstraintError(
        () => this.adminResourcesRepository.createPrompt(data),
        'Prompt title and version already exist',
        'DUPLICATE_PROMPT',
        PROMPT_TITLE_VERSION_UNIQUE_CONSTRAINTS
      )
    );
  }

  async updatePrompt(input: AdminPromptUpdateInput): Promise<AdminPromptItem> {
    const id = requireTrimmedMax(input.id, 'Prompt id', 100, 'Prompt id is required');
    const existing = await this.adminResourcesRepository.findPromptById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Prompt not found');
    }

    const data = normalizePromptUpdateInput(input);

    if (Object.keys(data).length === 0) {
      throw new AdminResourcesServiceError('BAD_REQUEST', 'Prompt update has no changes');
    }

    const title = data.title ?? existing.title;
    const version = data.version ?? existing.version;

    if (title !== existing.title || version !== existing.version) {
      await this.ensurePromptTitleVersionAvailable(title, version);
    }

    const updated = await mapUniqueConstraintError(
      () => this.adminResourcesRepository.updatePrompt({ id, ...data }),
      'Prompt title and version already exist',
      'DUPLICATE_PROMPT',
      PROMPT_TITLE_VERSION_UNIQUE_CONSTRAINTS
    );

    if (!updated) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Prompt not found');
    }

    return toPromptItem(updated);
  }

  async deletePrompt(input: AdminResourceDeleteInput): Promise<{ id: string }> {
    const id = requireTrimmedMax(input.id, 'Prompt id', 100, 'Prompt id is required');
    const existing = await this.adminResourcesRepository.findPromptById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Prompt not found');
    }

    if (await this.adminResourcesRepository.hasAgentUsingPrompt(id)) {
      throw new AdminResourcesServiceError('CONFLICT', 'Resource is in use', 'RESOURCE_IN_USE');
    }

    await this.adminResourcesRepository.softDeletePrompt(id);

    return { id };
  }

  async listSensitiveWordLists(): Promise<AdminSensitiveWordListItem[]> {
    return (await this.adminResourcesRepository.listSensitiveWordLists()).map(
      toSensitiveWordListItem
    );
  }

  async createSensitiveWordList(
    input: AdminSensitiveWordListCreateInput
  ): Promise<AdminSensitiveWordListItem> {
    const data = normalizeSensitiveWordListCreateInput(input);
    await this.ensureSensitiveWordListNameAvailable(data.name);

    return toSensitiveWordListItem(
      await mapUniqueConstraintError(
        () => this.adminResourcesRepository.createSensitiveWordList(data),
        'Sensitive word list name already exists',
        'DUPLICATE_SENSITIVE_WORD_LIST_NAME',
        SENSITIVE_WORD_LIST_NAME_UNIQUE_CONSTRAINTS
      )
    );
  }

  async updateSensitiveWordList(
    input: AdminSensitiveWordListUpdateInput
  ): Promise<AdminSensitiveWordListItem> {
    const id = requireTrimmedMax(
      input.id,
      'Sensitive word list id',
      100,
      'Sensitive word list id is required'
    );
    const existing = await this.adminResourcesRepository.findSensitiveWordListById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Sensitive word list not found');
    }

    const data = normalizeSensitiveWordListUpdateInput(input);

    if (Object.keys(data).length === 0) {
      throw new AdminResourcesServiceError(
        'BAD_REQUEST',
        'Sensitive word list update has no changes'
      );
    }

    if (data.name && data.name !== existing.name) {
      await this.ensureSensitiveWordListNameAvailable(data.name);
    }

    const updated = await mapUniqueConstraintError(
      () => this.adminResourcesRepository.updateSensitiveWordList({ id, ...data }),
      'Sensitive word list name already exists',
      'DUPLICATE_SENSITIVE_WORD_LIST_NAME',
      SENSITIVE_WORD_LIST_NAME_UNIQUE_CONSTRAINTS
    );

    if (!updated) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Sensitive word list not found');
    }

    return toSensitiveWordListItem(updated);
  }

  async deleteSensitiveWordList(input: AdminResourceDeleteInput): Promise<{ id: string }> {
    const id = requireTrimmedMax(
      input.id,
      'Sensitive word list id',
      100,
      'Sensitive word list id is required'
    );
    const existing = await this.adminResourcesRepository.findSensitiveWordListById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Sensitive word list not found');
    }

    if (await this.adminResourcesRepository.hasAgentUsingSensitiveWordList(id)) {
      throw new AdminResourcesServiceError('CONFLICT', 'Resource is in use', 'RESOURCE_IN_USE');
    }

    await this.adminResourcesRepository.softDeleteSensitiveWordList(id);

    return { id };
  }

  async listEngines(): Promise<{ items: AdminModelEngineItem[] }> {
    return {
      items: (await this.adminResourcesRepository.listEngines()).map(toEngineItem),
    };
  }

  async createEngine(input: AdminModelEngineCreateInput): Promise<AdminModelEngineItem> {
    const data = normalizeEngineCreateInput(input);
    await this.ensureEngineNameAvailable(data.name);

    return toEngineItem(
      await mapUniqueConstraintError(
        () => this.adminResourcesRepository.createEngine(data),
        'Engine name already exists',
        'DUPLICATE_ENGINE_NAME',
        ENGINE_NAME_UNIQUE_CONSTRAINTS
      )
    );
  }

  async updateEngine(input: AdminModelEngineUpdateInput): Promise<AdminModelEngineItem> {
    const id = requireTrimmedMax(input.id, 'Engine id', 100, 'Engine id is required');
    const existing = await this.adminResourcesRepository.findEngineById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Engine not found');
    }

    const data = normalizeEngineUpdateInput(input);

    if (Object.keys(data).length === 0) {
      throw new AdminResourcesServiceError('BAD_REQUEST', 'Engine update has no changes');
    }

    if (data.name && data.name !== existing.name) {
      await this.ensureEngineNameAvailable(data.name);
    }

    const updated = await mapUniqueConstraintError(
      () => this.adminResourcesRepository.updateEngine({ id, ...data }),
      'Engine name already exists',
      'DUPLICATE_ENGINE_NAME',
      ENGINE_NAME_UNIQUE_CONSTRAINTS
    );

    if (!updated) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Engine not found');
    }

    return toEngineItem(updated);
  }

  async deleteEngine(input: AdminResourceDeleteInput): Promise<{ id: string }> {
    const id = requireTrimmedMax(input.id, 'Engine id', 100, 'Engine id is required');
    const existing = await this.adminResourcesRepository.findEngineById(id);

    if (!existing) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Engine not found');
    }

    if (await this.adminResourcesRepository.hasAgentUsingEngine(id)) {
      throw new AdminResourcesServiceError('CONFLICT', 'Resource is in use', 'RESOURCE_IN_USE');
    }

    await this.adminResourcesRepository.softDeleteEngine(id);

    return { id };
  }

  private async validateAgentReferences(input: AdminAgentSaveData): Promise<void> {
    validateAgentClassification(input.key, input.grade, input.subject);

    if (!(await this.adminResourcesRepository.findEngineById(input.engineId))) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Engine not found');
    }

    if (input.promptId && !(await this.adminResourcesRepository.findPromptById(input.promptId))) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Prompt not found');
    }

    if (
      input.sensitiveListId &&
      !(await this.adminResourcesRepository.findSensitiveWordListById(input.sensitiveListId))
    ) {
      throw new AdminResourcesServiceError('NOT_FOUND', 'Sensitive word list not found');
    }
  }

  private async ensureAgentConfigAvailable(
    key: AdminAgentKey,
    grade: string | null,
    subject: string | null,
    excludeId?: string
  ): Promise<void> {
    const existing = await this.adminResourcesRepository.findAgentByClassificationIncludingDeleted({
      key,
      grade,
      subject,
    });

    if (existing && existing.id !== excludeId) {
      throw new AdminResourcesServiceError(
        'CONFLICT',
        'Agent key and category already exists',
        'AGENT_KEY_EXISTS'
      );
    }
  }

  private async ensurePromptTitleVersionAvailable(title: string, version: string): Promise<void> {
    if (await this.adminResourcesRepository.findPromptByTitleVersion(title, version)) {
      throw new AdminResourcesServiceError(
        'CONFLICT',
        'Prompt title and version already exist',
        'DUPLICATE_PROMPT'
      );
    }
  }

  private async ensureSensitiveWordListNameAvailable(name: string): Promise<void> {
    if (await this.adminResourcesRepository.findSensitiveWordListByNameIncludingDeleted(name)) {
      throw new AdminResourcesServiceError(
        'CONFLICT',
        'Sensitive word list name already exists',
        'DUPLICATE_SENSITIVE_WORD_LIST_NAME'
      );
    }
  }

  private async ensureEngineNameAvailable(name: string): Promise<void> {
    if (await this.adminResourcesRepository.findEngineByNameIncludingDeleted(name)) {
      throw new AdminResourcesServiceError(
        'CONFLICT',
        'Engine name already exists',
        'DUPLICATE_ENGINE_NAME'
      );
    }
  }
}

function normalizeAgentCreateInput(input: AdminAgentCreateInput): AdminAgentSaveData {
  const key = normalizeAgentKey(input.key);
  const classification = normalizeAgentClassification(key, input.grade, input.subject);

  return {
    key,
    ...classification,
    name: requireTrimmedMax(input.name, 'Agent name', 120, 'Agent name is required'),
    engineId: requireTrimmedMax(
      input.engineId,
      'Agent engineId',
      100,
      'Agent engineId is required'
    ),
    promptId: normalizeNullableId(input.promptId, 'Agent promptId'),
    sensitiveListId: normalizeNullableId(input.sensitiveListId, 'Agent sensitiveListId'),
    temperature: normalizeNumberRange(
      input.temperature,
      DEFAULT_AGENT_TEMPERATURE,
      0,
      2,
      'Agent temperature'
    ),
    topP: normalizeNumberRange(input.topP, DEFAULT_AGENT_TOP_P, 0, 1, 'Agent topP'),
    maxTokens: normalizePositiveInteger(
      input.maxTokens,
      DEFAULT_AGENT_MAX_TOKENS,
      'Agent maxTokens'
    ),
    status: normalizeStatus(input.status ?? DEFAULT_STATUS),
  };
}

function normalizeAgentUpdateInput(input: AdminAgentUpdateInput): Partial<AdminAgentSaveData> {
  const key = input.key === undefined ? undefined : normalizeAgentKey(input.key);
  const hasGrade = input.grade !== undefined;
  const hasSubject = input.subject !== undefined;

  return {
    ...(key === undefined ? {} : { key }),
    ...(hasGrade
      ? { grade: normalizeNullableClassificationValue(input.grade, 'Agent grade') }
      : {}),
    ...(hasSubject
      ? { subject: normalizeNullableClassificationValue(input.subject, 'Agent subject') }
      : {}),
    ...(input.name === undefined
      ? {}
      : { name: requireTrimmedMax(input.name, 'Agent name', 120, 'Agent name is required') }),
    ...(input.engineId === undefined
      ? {}
      : {
          engineId: requireTrimmedMax(
            input.engineId,
            'Agent engineId',
            100,
            'Agent engineId is required'
          ),
        }),
    ...(input.promptId === undefined
      ? {}
      : { promptId: normalizeNullableId(input.promptId, 'Agent promptId') }),
    ...(input.sensitiveListId === undefined
      ? {}
      : { sensitiveListId: normalizeNullableId(input.sensitiveListId, 'Agent sensitiveListId') }),
    ...(input.temperature === undefined
      ? {}
      : {
          temperature: normalizeNumberRange(
            input.temperature,
            DEFAULT_AGENT_TEMPERATURE,
            0,
            2,
            'Agent temperature'
          ),
        }),
    ...(input.topP === undefined
      ? {}
      : { topP: normalizeNumberRange(input.topP, DEFAULT_AGENT_TOP_P, 0, 1, 'Agent topP') }),
    ...(input.maxTokens === undefined
      ? {}
      : {
          maxTokens: normalizePositiveInteger(
            input.maxTokens,
            DEFAULT_AGENT_MAX_TOKENS,
            'Agent maxTokens'
          ),
        }),
    ...(input.status === undefined ? {} : { status: normalizeStatus(input.status) }),
  };
}

function normalizePromptCreateInput(input: AdminPromptCreateInput): AdminPromptSaveData {
  return {
    title: requireTrimmedMax(input.title, 'Prompt title', 120, 'Prompt title is required'),
    version: requireTrimmedMax(input.version, 'Prompt version', 50, 'Prompt version is required'),
    content: requireTrimmed(input.content, 'Prompt content is required'),
    createdByAdminId: normalizeNullableId(input.createdByAdminId, 'Prompt createdByAdminId'),
  };
}

function normalizePromptUpdateInput(input: AdminPromptUpdateInput): Partial<AdminPromptSaveData> {
  return {
    ...(input.title === undefined
      ? {}
      : { title: requireTrimmedMax(input.title, 'Prompt title', 120, 'Prompt title is required') }),
    ...(input.version === undefined
      ? {}
      : {
          version: requireTrimmedMax(
            input.version,
            'Prompt version',
            50,
            'Prompt version is required'
          ),
        }),
    ...(input.content === undefined
      ? {}
      : { content: requireTrimmed(input.content, 'Prompt content is required') }),
    ...(input.createdByAdminId === undefined
      ? {}
      : {
          createdByAdminId: normalizeNullableId(input.createdByAdminId, 'Prompt createdByAdminId'),
        }),
  };
}

function normalizeSensitiveWordListCreateInput(
  input: AdminSensitiveWordListCreateInput
): AdminSensitiveWordListSaveData {
  return {
    name: requireTrimmedMax(
      input.name,
      'Sensitive word list name',
      120,
      'Sensitive word list name is required'
    ),
    words: normalizeWords(input.words),
  };
}

function normalizeSensitiveWordListUpdateInput(
  input: AdminSensitiveWordListUpdateInput
): Partial<AdminSensitiveWordListSaveData> {
  return {
    ...(input.name === undefined
      ? {}
      : {
          name: requireTrimmedMax(
            input.name,
            'Sensitive word list name',
            120,
            'Sensitive word list name is required'
          ),
        }),
    ...(input.words === undefined ? {} : { words: normalizeWords(input.words) }),
  };
}

function normalizeEngineCreateInput(input: AdminModelEngineCreateInput): AdminEngineSaveData {
  return {
    name: requireTrimmedMax(input.name, 'Engine name', 100, 'Engine name is required'),
    provider: normalizeProvider(input.provider ?? DEFAULT_MODEL_ENGINE_PROVIDER),
    apiBaseUrl: normalizeApiBaseUrl(input.apiBaseUrl),
    apiKeyCiphertext: encryptApiKey(requireTrimmed(input.apiKey, 'Engine apiKey is required')),
    modelName: trimNullable(input.modelName),
    pricing: normalizePricing(input.pricing),
    status: normalizeStatus(input.status ?? DEFAULT_STATUS),
  };
}

function normalizeEngineUpdateInput(
  input: AdminModelEngineUpdateInput
): Partial<AdminEngineSaveData> {
  return {
    ...(input.name === undefined
      ? {}
      : { name: requireTrimmedMax(input.name, 'Engine name', 100, 'Engine name is required') }),
    ...(input.provider === undefined ? {} : { provider: normalizeProvider(input.provider) }),
    ...(input.apiBaseUrl === undefined
      ? {}
      : { apiBaseUrl: normalizeApiBaseUrl(input.apiBaseUrl) }),
    ...(input.apiKey === undefined
      ? {}
      : {
          apiKeyCiphertext: encryptApiKey(
            requireTrimmed(input.apiKey, 'Engine apiKey is required')
          ),
        }),
    ...(input.modelName === undefined ? {} : { modelName: trimNullable(input.modelName) }),
    ...(input.pricing === undefined ? {} : { pricing: normalizePricing(input.pricing) }),
    ...(input.status === undefined ? {} : { status: normalizeStatus(input.status) }),
  };
}

function toListResult<TRow, TItem>(
  rows: TRow[],
  input: NormalizedPageInput,
  mapper: (row: TRow) => TItem
): AdminResourceListResult<TItem> {
  const start = (input.page - 1) * input.pageSize;

  return {
    items: rows.slice(start, start + input.pageSize).map(mapper),
    total: rows.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

function toAgentItem(row: AdminAgentRepositoryRow): AdminAgentItem {
  return {
    id: row.id,
    key: row.key,
    grade: row.grade,
    subject: row.subject,
    name: row.name,
    engineId: row.engineId,
    promptId: row.promptId,
    sensitiveListId: row.sensitiveListId,
    temperature: row.temperature,
    topP: row.topP,
    maxTokens: row.maxTokens,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPromptItem(row: AdminPromptRepositoryRow): AdminPromptItem {
  return {
    id: row.id,
    title: row.title,
    version: row.version,
    content: row.content,
    createdByAdminId: row.createdByAdminId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSensitiveWordListItem(
  row: AdminSensitiveWordListRepositoryRow
): AdminSensitiveWordListItem {
  return {
    id: row.id,
    name: row.name,
    words: row.words,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toEngineItem(row: AdminEngineRepositoryRow): AdminModelEngineItem {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    apiBaseUrl: row.apiBaseUrl,
    apiKeyMasked: maskApiKey(decryptApiKey(row.apiKeyCiphertext)),
    modelName: row.modelName,
    pricing: row.pricing,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizePageInput(input: { page?: number; pageSize?: number }): NormalizedPageInput {
  return {
    page: normalizePositiveInteger(input.page, DEFAULT_PAGE, 'Page'),
    pageSize: Math.min(
      normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE, 'Page size'),
      MAX_PAGE_SIZE
    ),
  };
}

function normalizeAgentKey(value: string): AdminAgentKey {
  const key = requireTrimmed(value, 'Agent key is required');

  if (!ADMIN_AGENT_KEYS.includes(key as AdminAgentKey)) {
    throw new AdminResourcesServiceError('BAD_REQUEST', 'Agent key is invalid');
  }

  return key as AdminAgentKey;
}

function normalizeAgentClassification(
  key: AdminAgentKey,
  grade: string | null | undefined,
  subject: string | null | undefined
): { grade: string | null; subject: string | null } {
  const normalizedGrade = normalizeNullableClassificationValue(grade, 'Agent grade');
  const normalizedSubject = normalizeNullableClassificationValue(subject, 'Agent subject');

  validateAgentClassification(key, normalizedGrade, normalizedSubject);

  return {
    grade: normalizedGrade,
    subject: normalizedSubject,
  };
}

function validateAgentClassification(
  key: AdminAgentKey,
  grade: string | null,
  subject: string | null
): void {
  const mode = getAdminAgentClassificationMode(key);

  if (mode === 'none') {
    if (grade) {
      throw new AdminResourcesServiceError(
        'BAD_REQUEST',
        `Agent grade is not supported for ${key}`
      );
    }

    if (subject) {
      throw new AdminResourcesServiceError(
        'BAD_REQUEST',
        `Agent subject is not supported for ${key}`
      );
    }

    return;
  }

  if (!grade) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `Agent grade is required for ${key}`);
  }

  if (!getAdminAgentGradeOptions(key).includes(grade)) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `Agent grade is unsupported for ${key}`);
  }

  if (mode === 'grade') {
    if (subject) {
      throw new AdminResourcesServiceError(
        'BAD_REQUEST',
        `Agent subject is not supported for ${key}`
      );
    }

    return;
  }

  if (!subject) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `Agent subject is required for ${key}`);
  }
}

function normalizeNullableClassificationValue(
  value: string | null | undefined,
  field: string
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 50) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `${field} must be 50 characters or fewer`);
  }

  return trimmed;
}

function normalizeProvider(value: string): AdminModelEngineProvider {
  const provider = requireTrimmed(value, 'Engine provider is required');

  if (!ADMIN_MODEL_ENGINE_PROVIDERS.includes(provider as AdminModelEngineProvider)) {
    throw new AdminResourcesServiceError('BAD_REQUEST', 'Engine provider is invalid');
  }

  return provider as AdminModelEngineProvider;
}

function normalizeApiBaseUrl(value: string): string {
  const trimmed = requireTrimmed(value, 'Engine apiBaseUrl is required');

  try {
    const url = new URL(trimmed);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Invalid URL protocol');
    }

    return trimmed;
  } catch {
    throw new AdminResourcesServiceError('BAD_REQUEST', 'Engine apiBaseUrl is invalid');
  }
}

function normalizeStatus(value: string): AdminResourceStatus {
  const status = requireTrimmed(value, 'Status is required');

  if (!ADMIN_RESOURCE_STATUSES.includes(status as AdminResourceStatus)) {
    throw new AdminResourcesServiceError('BAD_REQUEST', 'Status is invalid');
  }

  return status as AdminResourceStatus;
}

function normalizeOptionalStatus(value: string | undefined): AdminResourceStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeStatus(value);
}

function normalizeNullableId(value: string | null | undefined, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return requireTrimmedMax(value, field, 100, `${field} is required`);
}

function normalizeWords(value: string[] | string): string[] {
  const words = (typeof value === 'string' ? value.split(',') : value)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    throw new AdminResourcesServiceError('BAD_REQUEST', 'Sensitive word list words are required');
  }

  return words;
}

function normalizePricing(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  return value ?? null;
}

function normalizeNumberRange(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  field: string
): number {
  const normalized = value ?? fallback;

  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `${field} is invalid`);
  }

  return normalized;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
  field: string
): number {
  const normalized = value ?? fallback;

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new AdminResourcesServiceError('BAD_REQUEST', `${field} must be a positive integer`);
  }

  return normalized;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AdminResourcesServiceError('BAD_REQUEST', message);
  }

  return trimmed;
}

function requireTrimmedMax(
  value: string,
  field: string,
  maxLength: number,
  message: string
): string {
  const trimmed = requireTrimmed(value, message);

  if (trimmed.length > maxLength) {
    throw new AdminResourcesServiceError(
      'BAD_REQUEST',
      `${field} must be ${maxLength} characters or fewer`
    );
  }

  return trimmed;
}

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function trimNullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function encryptApiKey(apiKey: string): string {
  return mapEngineApiKeyCryptoError(() => encryptEngineApiKey(apiKey));
}

function decryptApiKey(apiKeyCiphertext: string): string {
  return mapEngineApiKeyCryptoError(() => decryptEngineApiKey(apiKeyCiphertext));
}

function maskApiKey(apiKey: string): string {
  return maskEngineApiKey(apiKey);
}

function mapEngineApiKeyCryptoError<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof EngineApiKeyCryptoError) {
      throw new AdminResourcesServiceError('BAD_REQUEST', error.message);
    }

    throw error;
  }
}

export function isAdminResourcesDomainErrorCode(
  value: unknown
): value is AdminResourcesDomainErrorCode {
  return typeof value === 'string' && ADMIN_RESOURCES_DOMAIN_ERROR_CODE_SET.has(value);
}

async function mapUniqueConstraintError<T>(
  callback: () => Promise<T>,
  message: string,
  domainCode: AdminResourcesDomainErrorCode,
  constraints: readonly string[]
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (isPostgresUniqueViolation(error, constraints)) {
      throw new AdminResourcesServiceError('CONFLICT', message, domainCode);
    }

    throw error;
  }
}

function isPostgresUniqueViolation(error: unknown, constraints: readonly string[]): boolean {
  const postgresError = findPostgresUniqueViolation(error);

  if (!postgresError) {
    return false;
  }

  if (typeof postgresError.constraint !== 'string') {
    return true;
  }

  return constraints.includes(postgresError.constraint);
}

function findPostgresUniqueViolation(
  error: unknown,
  seen: Set<unknown> = new Set()
): { constraint?: unknown } | null {
  if (!isErrorRecord(error) || seen.has(error)) {
    return null;
  }
  seen.add(error);

  if (error.code === '23505') {
    return { constraint: error.constraint };
  }

  for (const key of ['cause', 'driverError', 'originalError']) {
    if (key in error) {
      const nested = findPostgresUniqueViolation(error[key], seen);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function isErrorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
