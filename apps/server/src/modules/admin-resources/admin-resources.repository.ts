import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  aiAgents,
  aiPrompts,
  modelEngines,
  sensitiveWordLists,
  type AiAgentKey,
  type AiResourceStatus,
  type ModelEngineProvider,
} from '@package/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';

export type AdminAgentRepositoryRow = typeof aiAgents.$inferSelect;
export type AdminPromptRepositoryRow = typeof aiPrompts.$inferSelect;
export type AdminSensitiveWordListRepositoryRow = typeof sensitiveWordLists.$inferSelect;
export type AdminEngineRepositoryRow = typeof modelEngines.$inferSelect;

export type AdminAgentSaveData = {
  key: AiAgentKey;
  name: string;
  engineId: string;
  promptId: string | null;
  sensitiveListId: string | null;
  temperature: number;
  topP: number;
  maxTokens: number;
  status: AiResourceStatus;
};

export type AdminPromptSaveData = {
  title: string;
  version: string;
  content: string;
  createdByAdminId: string | null;
};

export type AdminSensitiveWordListSaveData = {
  name: string;
  words: string[];
};

export type AdminEngineSaveData = {
  name: string;
  provider: ModelEngineProvider;
  apiBaseUrl: string;
  apiKeyCiphertext: string;
  modelName: string | null;
  pricing: Record<string, unknown> | null;
  status: AiResourceStatus;
};

@Injectable()
export class AdminResourcesRepository {
  private readonly database: Database = db;

  async listAgents(): Promise<AdminAgentRepositoryRow[]> {
    return this.database
      .select()
      .from(aiAgents)
      .where(isNull(aiAgents.deletedAt))
      .orderBy(asc(aiAgents.key));
  }

  async findAgentById(id: string): Promise<AdminAgentRepositoryRow | null> {
    const [agent] = await this.database
      .select()
      .from(aiAgents)
      .where(and(eq(aiAgents.id, id), isNull(aiAgents.deletedAt)))
      .limit(1);

    return agent ?? null;
  }

  async findAgentByKey(key: string): Promise<AdminAgentRepositoryRow | null> {
    const [agent] = await this.database
      .select()
      .from(aiAgents)
      .where(and(eq(aiAgents.key, key as AiAgentKey), isNull(aiAgents.deletedAt)))
      .limit(1);

    return agent ?? null;
  }

  async findAgentByKeyIncludingDeleted(key: string): Promise<AdminAgentRepositoryRow | null> {
    const [agent] = await this.database
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.key, key as AiAgentKey))
      .limit(1);

    return agent ?? null;
  }

  async createAgent(input: AdminAgentSaveData): Promise<AdminAgentRepositoryRow> {
    const [agent] = await this.database.insert(aiAgents).values(input).returning();

    return agent!;
  }

  async updateAgent(
    input: Partial<AdminAgentSaveData> & { id: string }
  ): Promise<AdminAgentRepositoryRow | null> {
    const { id, ...values } = input;
    const [agent] = await this.database
      .update(aiAgents)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(aiAgents.id, id), isNull(aiAgents.deletedAt)))
      .returning();

    return agent ?? null;
  }

  async softDeleteAgent(id: string): Promise<boolean> {
    const [agent] = await this.database
      .update(aiAgents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(aiAgents.id, id), isNull(aiAgents.deletedAt)))
      .returning({ id: aiAgents.id });

    return Boolean(agent);
  }

  async listPrompts(): Promise<AdminPromptRepositoryRow[]> {
    return this.database
      .select()
      .from(aiPrompts)
      .where(isNull(aiPrompts.deletedAt))
      .orderBy(asc(aiPrompts.title), asc(aiPrompts.version));
  }

  async findPromptById(id: string): Promise<AdminPromptRepositoryRow | null> {
    const [prompt] = await this.database
      .select()
      .from(aiPrompts)
      .where(and(eq(aiPrompts.id, id), isNull(aiPrompts.deletedAt)))
      .limit(1);

    return prompt ?? null;
  }

  async findPromptByTitleVersion(
    title: string,
    version: string
  ): Promise<AdminPromptRepositoryRow | null> {
    const [prompt] = await this.database
      .select()
      .from(aiPrompts)
      .where(
        and(eq(aiPrompts.title, title), eq(aiPrompts.version, version), isNull(aiPrompts.deletedAt))
      )
      .limit(1);

    return prompt ?? null;
  }

  async createPrompt(input: AdminPromptSaveData): Promise<AdminPromptRepositoryRow> {
    const [prompt] = await this.database.insert(aiPrompts).values(input).returning();

    return prompt!;
  }

  async updatePrompt(
    input: Partial<AdminPromptSaveData> & { id: string }
  ): Promise<AdminPromptRepositoryRow | null> {
    const { id, ...values } = input;
    const [prompt] = await this.database
      .update(aiPrompts)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(aiPrompts.id, id), isNull(aiPrompts.deletedAt)))
      .returning();

    return prompt ?? null;
  }

  async softDeletePrompt(id: string): Promise<boolean> {
    const [prompt] = await this.database
      .update(aiPrompts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(aiPrompts.id, id), isNull(aiPrompts.deletedAt)))
      .returning({ id: aiPrompts.id });

    return Boolean(prompt);
  }

  async listSensitiveWordLists(): Promise<AdminSensitiveWordListRepositoryRow[]> {
    return this.database
      .select()
      .from(sensitiveWordLists)
      .where(isNull(sensitiveWordLists.deletedAt))
      .orderBy(asc(sensitiveWordLists.name));
  }

  async findSensitiveWordListById(id: string): Promise<AdminSensitiveWordListRepositoryRow | null> {
    const [list] = await this.database
      .select()
      .from(sensitiveWordLists)
      .where(and(eq(sensitiveWordLists.id, id), isNull(sensitiveWordLists.deletedAt)))
      .limit(1);

    return list ?? null;
  }

  async findSensitiveWordListByName(
    name: string
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    const [list] = await this.database
      .select()
      .from(sensitiveWordLists)
      .where(and(eq(sensitiveWordLists.name, name), isNull(sensitiveWordLists.deletedAt)))
      .limit(1);

    return list ?? null;
  }

  async findSensitiveWordListByNameIncludingDeleted(
    name: string
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    const [list] = await this.database
      .select()
      .from(sensitiveWordLists)
      .where(eq(sensitiveWordLists.name, name))
      .limit(1);

    return list ?? null;
  }

  async createSensitiveWordList(
    input: AdminSensitiveWordListSaveData
  ): Promise<AdminSensitiveWordListRepositoryRow> {
    const [list] = await this.database.insert(sensitiveWordLists).values(input).returning();

    return list!;
  }

  async updateSensitiveWordList(
    input: Partial<AdminSensitiveWordListSaveData> & { id: string }
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    const { id, ...values } = input;
    const [list] = await this.database
      .update(sensitiveWordLists)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(sensitiveWordLists.id, id), isNull(sensitiveWordLists.deletedAt)))
      .returning();

    return list ?? null;
  }

  async softDeleteSensitiveWordList(id: string): Promise<boolean> {
    const [list] = await this.database
      .update(sensitiveWordLists)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(sensitiveWordLists.id, id), isNull(sensitiveWordLists.deletedAt)))
      .returning({ id: sensitiveWordLists.id });

    return Boolean(list);
  }

  async listEngines(): Promise<AdminEngineRepositoryRow[]> {
    return this.database
      .select()
      .from(modelEngines)
      .where(isNull(modelEngines.deletedAt))
      .orderBy(asc(modelEngines.name));
  }

  async findEngineById(id: string): Promise<AdminEngineRepositoryRow | null> {
    const [engine] = await this.database
      .select()
      .from(modelEngines)
      .where(and(eq(modelEngines.id, id), isNull(modelEngines.deletedAt)))
      .limit(1);

    return engine ?? null;
  }

  async findEngineByName(name: string): Promise<AdminEngineRepositoryRow | null> {
    const [engine] = await this.database
      .select()
      .from(modelEngines)
      .where(and(eq(modelEngines.name, name), isNull(modelEngines.deletedAt)))
      .limit(1);

    return engine ?? null;
  }

  async findEngineByNameIncludingDeleted(name: string): Promise<AdminEngineRepositoryRow | null> {
    const [engine] = await this.database
      .select()
      .from(modelEngines)
      .where(eq(modelEngines.name, name))
      .limit(1);

    return engine ?? null;
  }

  async createEngine(input: AdminEngineSaveData): Promise<AdminEngineRepositoryRow> {
    const [engine] = await this.database.insert(modelEngines).values(input).returning();

    return engine!;
  }

  async updateEngine(
    input: Partial<AdminEngineSaveData> & { id: string }
  ): Promise<AdminEngineRepositoryRow | null> {
    const { id, ...values } = input;
    const [engine] = await this.database
      .update(modelEngines)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(modelEngines.id, id), isNull(modelEngines.deletedAt)))
      .returning();

    return engine ?? null;
  }

  async softDeleteEngine(id: string): Promise<boolean> {
    const [engine] = await this.database
      .update(modelEngines)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(modelEngines.id, id), isNull(modelEngines.deletedAt)))
      .returning({ id: modelEngines.id });

    return Boolean(engine);
  }

  async hasAgentUsingEngine(engineId: string): Promise<boolean> {
    const [agent] = await this.database
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(and(eq(aiAgents.engineId, engineId), isNull(aiAgents.deletedAt)))
      .limit(1);

    return Boolean(agent);
  }

  async hasAgentUsingPrompt(promptId: string): Promise<boolean> {
    const [agent] = await this.database
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(and(eq(aiAgents.promptId, promptId), isNull(aiAgents.deletedAt)))
      .limit(1);

    return Boolean(agent);
  }

  async hasAgentUsingSensitiveWordList(sensitiveListId: string): Promise<boolean> {
    const [agent] = await this.database
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(and(eq(aiAgents.sensitiveListId, sensitiveListId), isNull(aiAgents.deletedAt)))
      .limit(1);

    return Boolean(agent);
  }
}
