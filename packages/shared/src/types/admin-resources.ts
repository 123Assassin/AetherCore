import type { AdminAgentKey } from './agent-mapping.js';

export type { AdminAgentKey } from './agent-mapping.js';
export { adminAgentKeys } from './agent-mapping.js';

export const adminResourceStatuses = ['enabled', 'disabled'] as const;
export type AdminResourceStatus = (typeof adminResourceStatuses)[number];

export const adminModelEngineProviders = ['openai', 'gemini', 'custom'] as const;
export type AdminModelEngineProvider = (typeof adminModelEngineProviders)[number];

export const adminModelEngineCategories = ['reasoning', 'vision'] as const;
export type AdminModelEngineCategory = (typeof adminModelEngineCategories)[number];

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
  category: AdminModelEngineCategory;
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
  category?: AdminModelEngineCategory;
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
