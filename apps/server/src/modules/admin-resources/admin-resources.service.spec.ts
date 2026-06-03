import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  AdminAgentRepositoryRow,
  AdminAgentSaveData,
  AdminEngineRepositoryRow,
  AdminEngineSaveData,
  AdminPromptRepositoryRow,
  AdminPromptSaveData,
  AdminSensitiveWordListRepositoryRow,
  AdminSensitiveWordListSaveData,
} from './admin-resources.repository.js';
import {
  AdminResourcesService,
  AdminResourcesServiceError,
  type AdminResourcesDomainErrorCode,
} from './admin-resources.service.js';
import type { AdminResourcesRepository } from './admin-resources.repository.js';

const now = new Date('2026-05-19T00:00:00.000Z');

test('creating agent with nonexistent engine returns typed not found error', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'chat',
        name: 'Chat Agent',
        engineId: 'missing-engine',
        promptId: 'prompt-1',
        sensitiveListId: 'sensitive-1',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2000,
        status: 'enabled',
      }),
    serviceError('NOT_FOUND', 'Engine not found')
  );
  assert.equal(repository.agents.length, 1);
});

test('creating comment agents uses key plus grade as the uniqueness scope', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  const elementaryAgent = await service.createAgent({
    key: 'comment',
    name: '小学评语智能体',
    engineId: 'engine-1',
    grade: '小学',
  } as never);
  const middleSchoolAgent = await service.createAgent({
    key: 'comment',
    name: '初中评语智能体',
    engineId: 'engine-1',
    grade: '初中',
  } as never);

  assert.equal((elementaryAgent as { grade?: string | null }).grade, '小学');
  assert.equal((elementaryAgent as { subject?: string | null }).subject, null);
  assert.equal((middleSchoolAgent as { grade?: string | null }).grade, '初中');
  assert.equal((middleSchoolAgent as { subject?: string | null }).subject, null);

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'comment',
        name: '重复小学评语智能体',
        engineId: 'engine-1',
        grade: '小学',
      } as never),
    serviceError('CONFLICT', 'Agent key and category already exists', 'AGENT_KEY_EXISTS')
  );
});

test('creating teaching agents uses key plus grade and subject as the uniqueness scope', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  const mathAgent = await service.createAgent({
    key: 'teaching',
    name: '初中数学题目变身智能体',
    engineId: 'engine-1',
    grade: '初中',
    subject: '数学',
  } as never);
  const chineseAgent = await service.createAgent({
    key: 'teaching',
    name: '初中语文题目变身智能体',
    engineId: 'engine-1',
    grade: '初中',
    subject: '语文',
  } as never);

  assert.equal(mathAgent.grade, '初中');
  assert.equal(mathAgent.subject, '数学');
  assert.equal(chineseAgent.grade, '初中');
  assert.equal(chineseAgent.subject, '语文');

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'teaching',
        name: '重复初中数学题目变身智能体',
        engineId: 'engine-1',
        grade: '初中',
        subject: '数学',
      } as never),
    serviceError('CONFLICT', 'Agent key and category already exists', 'AGENT_KEY_EXISTS')
  );
});

test('agent classification fields are determined by the agent key', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'inspiration',
        name: '知识精讲智能体',
        engineId: 'engine-1',
        grade: '初中',
      } as never),
    serviceError('BAD_REQUEST', 'Agent subject is required for inspiration')
  );

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'comment',
        name: '学生评语智能体',
        engineId: 'engine-1',
        grade: '初中',
        subject: '数学',
      } as never),
    serviceError('BAD_REQUEST', 'Agent subject is not supported for comment')
  );

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'teaching',
        name: '题目变身智能体',
        engineId: 'engine-1',
        grade: '初中',
      } as never),
    serviceError('BAD_REQUEST', 'Agent subject is required for teaching')
  );

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'teaching',
        name: '题目变身智能体',
        engineId: 'engine-1',
        grade: '高中',
      } as never),
    serviceError('BAD_REQUEST', 'Agent grade is unsupported for teaching')
  );

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'chat',
        name: 'AI 助手智能体',
        engineId: 'engine-1',
        grade: '初中',
      } as never),
    serviceError('BAD_REQUEST', 'Agent grade is not supported for chat')
  );
});

test('updating an agent rejects changing the agent key', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.updateAgent({
        id: 'agent-1',
        key: 'chat',
        name: 'Chat Agent',
      }),
    serviceError('BAD_REQUEST', 'Agent key cannot be changed')
  );
  assert.equal(repository.agents[0]?.key, 'comment');
});

test('engine list masks api keys', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  const result = await service.listEngines();

  assert.equal(result.items[0]?.apiKeyMasked, 'sk-t...cdef');
  assert.equal('apiKey' in result.items[0]!, false);
  assert.equal('apiKeyCiphertext' in result.items[0]!, false);
});

test('creating engine rejects invalid apiBaseUrl before repository write', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createEngine({
        name: 'Invalid URL Engine',
        provider: 'custom',
        apiBaseUrl: 'not-a-url',
        apiKey: 'sk-new-secret',
      }),
    serviceError('BAD_REQUEST', 'Engine apiBaseUrl is invalid')
  );
  assert.equal(repository.engines.length, 1);
});

test('creating engine without encryption secret in normal runtime returns typed bad request', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await withEnv(
    { AETHERCORE_ENGINE_API_KEY_SECRET: undefined, NODE_ENV: 'development' },
    async () => {
      await assert.rejects(
        () =>
          service.createEngine({
            name: 'No Secret Engine',
            provider: 'custom',
            apiBaseUrl: 'https://llm.example.com/v1',
            apiKey: 'sk-new-secret',
          }),
        serviceError('BAD_REQUEST', 'Engine API key encryption secret is not configured')
      );
    }
  );
  assert.equal(repository.engines.length, 1);
});

test('creating engine in test runtime uses test encryption key and masks response', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await withEnv({ AETHERCORE_ENGINE_API_KEY_SECRET: undefined, NODE_ENV: 'test' }, async () => {
    const result = await service.createEngine({
      name: 'Test Engine',
      provider: 'custom',
      apiBaseUrl: 'https://llm.example.com/v1',
      apiKey: 'sk-test-secret-123456',
    });

    assert.equal(result.apiKeyMasked, 'sk-t...3456');
    assert.equal('apiKey' in result, false);
    assert.equal('apiKeyCiphertext' in result, false);
    assert.match(repository.engines.at(-1)!.apiKeyCiphertext, /^v1:/);
  });
});

test('creating agent conflicts when a soft-deleted row owns the key', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.agents.push({
    id: 'agent-deleted',
    key: 'chat',
    grade: null,
    subject: null,
    name: 'Deleted Chat Agent',
    engineId: 'engine-1',
    promptId: null,
    sensitiveListId: null,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2000,
    status: 'disabled',
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createAgent({
        key: 'chat',
        name: 'Chat Agent',
        engineId: 'engine-1',
      }),
    serviceError('CONFLICT', 'Agent key and category already exists', 'AGENT_KEY_EXISTS')
  );
});

test('creating engine conflicts when a soft-deleted row owns the name', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.engines[0]!.deletedAt = now;
  const service = new AdminResourcesService(repository.asRepository());

  await withEnv({ AETHERCORE_ENGINE_API_KEY_SECRET: 'test-secret', NODE_ENV: 'test' }, async () => {
    await assert.rejects(
      () =>
        service.createEngine({
          name: 'OpenAI',
          provider: 'openai',
          apiBaseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-new-secret',
        }),
      serviceError('CONFLICT', 'Engine name already exists', 'DUPLICATE_ENGINE_NAME')
    );
  });
});

test('creating sensitive word list conflicts when a soft-deleted row owns the name', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.sensitiveWordLists[0]!.deletedAt = now;
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () => service.createSensitiveWordList({ name: 'Default words', words: ['blocked'] }),
    serviceError(
      'CONFLICT',
      'Sensitive word list name already exists',
      'DUPLICATE_SENSITIVE_WORD_LIST_NAME'
    )
  );
});

test('raw engine unique constraint failures return typed duplicate engine conflict', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.createEngineError = uniqueViolation('model_engines_name_unique');
  const service = new AdminResourcesService(repository.asRepository());

  await withEnv({ AETHERCORE_ENGINE_API_KEY_SECRET: 'test-secret', NODE_ENV: 'test' }, async () => {
    await assert.rejects(
      () =>
        service.createEngine({
          name: 'Race Engine',
          provider: 'custom',
          apiBaseUrl: 'https://llm.example.com/v1',
          apiKey: 'sk-new-secret',
        }),
      serviceError('CONFLICT', 'Engine name already exists', 'DUPLICATE_ENGINE_NAME')
    );
  });
});

test('raw engine update unique constraint failures return typed duplicate engine conflict', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.updateEngineError = uniqueViolation('model_engines_name_unique');
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () => service.updateEngine({ id: 'engine-1', name: 'Race Engine' }),
    serviceError('CONFLICT', 'Engine name already exists', 'DUPLICATE_ENGINE_NAME')
  );
});

test('raw prompt unique constraint failures return typed duplicate prompt conflict', async () => {
  const repository = new FakeAdminResourcesRepository();
  repository.createPromptError = uniqueViolation('uniq_prompt_title_version');
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createPrompt({
        title: 'Race Prompt',
        version: 'v1',
        content: 'Prompt content',
      }),
    serviceError('CONFLICT', 'Prompt title and version already exist', 'DUPLICATE_PROMPT')
  );
});

test('deleting referenced prompt returns typed conflict error', async () => {
  const repository = new FakeAdminResourcesRepository();
  const service = new AdminResourcesService(repository.asRepository());

  await assert.rejects(
    () => service.deletePrompt({ id: 'prompt-1' }),
    serviceError('CONFLICT', 'Resource is in use', 'RESOURCE_IN_USE')
  );
  assert.equal(repository.prompts.find((prompt) => prompt.id === 'prompt-1')?.deletedAt, null);
});

class FakeAdminResourcesRepository {
  createEngineError: unknown = null;
  updateEngineError: unknown = null;
  createPromptError: unknown = null;

  readonly engines: AdminEngineRepositoryRow[] = [
    {
      id: 'engine-1',
      name: 'OpenAI',
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKeyCiphertext: Buffer.from('sk-test-secret-abcdef', 'utf8').toString('base64'),
      modelName: 'gpt-4.1',
      pricing: null,
      status: 'enabled',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  readonly prompts: AdminPromptRepositoryRow[] = [
    {
      id: 'prompt-1',
      title: 'Default',
      version: 'v1',
      content: 'Prompt content',
      createdByAdminId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  readonly sensitiveWordLists: AdminSensitiveWordListRepositoryRow[] = [
    {
      id: 'sensitive-1',
      name: 'Default words',
      words: ['bad'],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  readonly agents: AdminAgentRepositoryRow[] = [
    {
      id: 'agent-1',
      key: 'comment',
      grade: null,
      subject: null,
      name: 'Comment Agent',
      engineId: 'engine-1',
      promptId: 'prompt-1',
      sensitiveListId: 'sensitive-1',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2000,
      status: 'enabled',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  asRepository(): AdminResourcesRepository {
    return this as unknown as AdminResourcesRepository;
  }

  async listAgents(): Promise<AdminAgentRepositoryRow[]> {
    return this.agents.filter((agent) => !agent.deletedAt);
  }

  async findAgentById(id: string): Promise<AdminAgentRepositoryRow | null> {
    return this.agents.find((agent) => agent.id === id && !agent.deletedAt) ?? null;
  }

  async findAgentByKey(key: string): Promise<AdminAgentRepositoryRow | null> {
    return this.agents.find((agent) => agent.key === key && !agent.deletedAt) ?? null;
  }

  async findAgentByKeyIncludingDeleted(key: string): Promise<AdminAgentRepositoryRow | null> {
    return this.agents.find((agent) => agent.key === key) ?? null;
  }

  async findAgentByClassificationIncludingDeleted(input: {
    key: string;
    grade: string | null;
    subject: string | null;
  }): Promise<AdminAgentRepositoryRow | null> {
    return (
      this.agents.find(
        (agent) =>
          agent.key === input.key && agent.grade === input.grade && agent.subject === input.subject
      ) ?? null
    );
  }

  async createAgent(input: AdminAgentSaveData): Promise<AdminAgentRepositoryRow> {
    const agent = {
      id: `agent-${this.agents.length + 1}`,
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.agents.push(agent);
    return agent;
  }

  async updateAgent(
    input: AdminAgentSaveData & { id: string }
  ): Promise<AdminAgentRepositoryRow | null> {
    const agent = await this.findAgentById(input.id);
    if (!agent) {
      return null;
    }
    Object.assign(agent, input, { updatedAt: now });
    return agent;
  }

  async softDeleteAgent(id: string): Promise<boolean> {
    const agent = await this.findAgentById(id);
    if (!agent) {
      return false;
    }
    agent.deletedAt = now;
    return true;
  }

  async listPrompts(): Promise<AdminPromptRepositoryRow[]> {
    return this.prompts.filter((prompt) => !prompt.deletedAt);
  }

  async findPromptById(id: string): Promise<AdminPromptRepositoryRow | null> {
    return this.prompts.find((prompt) => prompt.id === id && !prompt.deletedAt) ?? null;
  }

  async findPromptByTitleVersion(
    title: string,
    version: string
  ): Promise<AdminPromptRepositoryRow | null> {
    return (
      this.prompts.find(
        (prompt) => prompt.title === title && prompt.version === version && !prompt.deletedAt
      ) ?? null
    );
  }

  async createPrompt(input: AdminPromptSaveData): Promise<AdminPromptRepositoryRow> {
    if (this.createPromptError) {
      throw this.createPromptError;
    }

    const prompt = {
      id: `prompt-${this.prompts.length + 1}`,
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.prompts.push(prompt);
    return prompt;
  }

  async updatePrompt(
    input: AdminPromptSaveData & { id: string }
  ): Promise<AdminPromptRepositoryRow | null> {
    const prompt = await this.findPromptById(input.id);
    if (!prompt) {
      return null;
    }
    Object.assign(prompt, input, { updatedAt: now });
    return prompt;
  }

  async softDeletePrompt(id: string): Promise<boolean> {
    const prompt = await this.findPromptById(id);
    if (!prompt) {
      return false;
    }
    prompt.deletedAt = now;
    return true;
  }

  async listSensitiveWordLists(): Promise<AdminSensitiveWordListRepositoryRow[]> {
    return this.sensitiveWordLists.filter((list) => !list.deletedAt);
  }

  async findSensitiveWordListById(id: string): Promise<AdminSensitiveWordListRepositoryRow | null> {
    return this.sensitiveWordLists.find((list) => list.id === id && !list.deletedAt) ?? null;
  }

  async findSensitiveWordListByName(
    name: string
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    return this.sensitiveWordLists.find((list) => list.name === name && !list.deletedAt) ?? null;
  }

  async findSensitiveWordListByNameIncludingDeleted(
    name: string
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    return this.sensitiveWordLists.find((list) => list.name === name) ?? null;
  }

  async createSensitiveWordList(
    input: AdminSensitiveWordListSaveData
  ): Promise<AdminSensitiveWordListRepositoryRow> {
    const list = {
      id: `sensitive-${this.sensitiveWordLists.length + 1}`,
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.sensitiveWordLists.push(list);
    return list;
  }

  async updateSensitiveWordList(
    input: AdminSensitiveWordListSaveData & { id: string }
  ): Promise<AdminSensitiveWordListRepositoryRow | null> {
    const list = await this.findSensitiveWordListById(input.id);
    if (!list) {
      return null;
    }
    Object.assign(list, input, { updatedAt: now });
    return list;
  }

  async softDeleteSensitiveWordList(id: string): Promise<boolean> {
    const list = await this.findSensitiveWordListById(id);
    if (!list) {
      return false;
    }
    list.deletedAt = now;
    return true;
  }

  async listEngines(): Promise<AdminEngineRepositoryRow[]> {
    return this.engines.filter((engine) => !engine.deletedAt);
  }

  async findEngineById(id: string): Promise<AdminEngineRepositoryRow | null> {
    return this.engines.find((engine) => engine.id === id && !engine.deletedAt) ?? null;
  }

  async findEngineByName(name: string): Promise<AdminEngineRepositoryRow | null> {
    return this.engines.find((engine) => engine.name === name && !engine.deletedAt) ?? null;
  }

  async findEngineByNameIncludingDeleted(name: string): Promise<AdminEngineRepositoryRow | null> {
    return this.engines.find((engine) => engine.name === name) ?? null;
  }

  async createEngine(input: AdminEngineSaveData): Promise<AdminEngineRepositoryRow> {
    if (this.createEngineError) {
      throw this.createEngineError;
    }

    const engine = {
      id: `engine-${this.engines.length + 1}`,
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.engines.push(engine);
    return engine;
  }

  async updateEngine(
    input: Partial<AdminEngineSaveData> & { id: string }
  ): Promise<AdminEngineRepositoryRow | null> {
    if (this.updateEngineError) {
      throw this.updateEngineError;
    }

    const engine = await this.findEngineById(input.id);
    if (!engine) {
      return null;
    }
    Object.assign(engine, input, { updatedAt: now });
    return engine;
  }

  async softDeleteEngine(id: string): Promise<boolean> {
    const engine = await this.findEngineById(id);
    if (!engine) {
      return false;
    }
    engine.deletedAt = now;
    return true;
  }

  async hasAgentUsingEngine(engineId: string): Promise<boolean> {
    return this.agents.some((agent) => agent.engineId === engineId && !agent.deletedAt);
  }

  async hasAgentUsingPrompt(promptId: string): Promise<boolean> {
    return this.agents.some((agent) => agent.promptId === promptId && !agent.deletedAt);
  }

  async hasAgentUsingSensitiveWordList(sensitiveListId: string): Promise<boolean> {
    return this.agents.some(
      (agent) => agent.sensitiveListId === sensitiveListId && !agent.deletedAt
    );
  }
}

function serviceError(
  code: 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT',
  message: string,
  domainCode: AdminResourcesDomainErrorCode = code
): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof AdminResourcesServiceError &&
    error.code === code &&
    error.message === message &&
    error.domainCode === domainCode;
}

function uniqueViolation(constraint: string): Error & { code: string; constraint: string } {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    constraint,
  });
}

async function withEnv(
  values: Record<string, string | undefined>,
  callback: () => Promise<void>
): Promise<void> {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  ) as Record<string, string | undefined>;

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
