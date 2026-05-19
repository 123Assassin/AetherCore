import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SimulationsRepository } from './simulations.repository.js';
import { SimulationsService, SimulationsServiceError } from './simulations.service.js';

type Row = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  src: string | null;
  thumbnail: string | null;
  isable: boolean;
  topics: unknown[] | null;
  sampleLearningGoals: unknown[] | null;
  grades: string[];
  createdAt: Date;
  updatedAt: Date;
};

test('public list excludes disabled simulations', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.listPublic({});

  assert.deepEqual(
    result.items.map((item) => item.id),
    ['sim-enabled', 'sim-root-category']
  );
  assert.equal(
    result.items.every((item) => item.isable),
    true
  );
});

test('admin list includes disabled simulations', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.listAdmin({});

  assert.deepEqual(
    result.items.map((item) => item.id),
    ['sim-enabled', 'sim-disabled', 'sim-root-category']
  );
});

test('filters returns subject category and grade options', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.filters({ enabledOnly: false });

  assert.deepEqual(result.subjects, [
    {
      name: '物理',
      categories: [{ id: 'physics-motion', name: '运动' }],
    },
    {
      name: '数学',
      categories: [{ id: 'math', name: '数学' }],
    },
  ]);
  assert.deepEqual(result.categories, [
    { id: 'physics-motion', name: '运动', subject: '物理' },
    { id: 'math', name: '数学', subject: '数学' },
  ]);
  assert.deepEqual(result.grades, ['中学', '高中', '大学']);
});

test('setEnabled updates a simulation enabled flag', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.setEnabled({ id: ' sim-disabled ', isable: true });

  assert.equal(result.id, 'sim-disabled');
  assert.equal(result.isable, true);
  assert.equal(repository.rows.find((row) => row.id === 'sim-disabled')?.isable, true);
});

test('update trims editable text fields and persists them', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.update({
    id: 'sim-enabled',
    name: '  Updated Simulation  ',
    thumbnail: '  updated.png  ',
    src: '  updated.html  ',
  });

  assert.equal(result.name, 'Updated Simulation');
  assert.equal(result.thumbnail, 'updated.png');
  assert.equal(result.src, 'updated.html');
});

test('update trims dedupes and persists grade associations', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  const result = await service.update({
    id: 'sim-enabled',
    grades: [' 高中 ', '大学', '高中', '  '],
  });

  assert.deepEqual(result.grades, ['高中', '大学']);
  const persistedGrades = repository.rows.find((row) => row.id === 'sim-enabled')?.grades;
  assert.deepEqual(persistedGrades, ['高中', '大学']);
});

test('update rejects no-op payloads', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  await assert.rejects(
    () => service.update({ id: 'sim-enabled' }),
    serviceError('BAD_REQUEST', 'Simulation update has no changes')
  );
});

test('update returns not found for missing simulations', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  await assert.rejects(
    () => service.update({ id: 'missing-simulation', name: 'Updated Simulation' }),
    serviceError('NOT_FOUND', 'Simulation not found')
  );
});

test('update rejects root category ids', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  await assert.rejects(
    () => service.update({ id: 'sim-enabled', categoryId: 'math' }),
    serviceError('BAD_REQUEST', 'Simulation categoryId must be a secondary category')
  );
  assert.equal(
    repository.rows.find((row) => row.id === 'sim-enabled')?.categoryId,
    'physics-motion'
  );
});

test('update rejects unknown category ids', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  await assert.rejects(
    () => service.update({ id: 'sim-enabled', categoryId: 'missing-category' }),
    serviceError('BAD_REQUEST', 'Simulation categoryId must be a secondary category')
  );
  assert.equal(
    repository.rows.find((row) => row.id === 'sim-enabled')?.categoryId,
    'physics-motion'
  );
});

test('update validates varchar-backed input lengths', async () => {
  const repository = new FakeSimulationsRepository();
  const service = new SimulationsService(repository.asRepository());

  await assert.rejects(
    () => service.update({ id: `${'s'.repeat(101)}`, name: 'Updated Simulation' }),
    serviceError('BAD_REQUEST', 'Simulation id must be 100 characters or fewer')
  );
  await assert.rejects(
    () => service.update({ id: 'sim-enabled', name: 's'.repeat(101) }),
    serviceError('BAD_REQUEST', 'Simulation name must be 100 characters or fewer')
  );
  await assert.rejects(
    () => service.update({ id: 'sim-enabled', categoryId: 's'.repeat(101) }),
    serviceError('BAD_REQUEST', 'Simulation categoryId must be 100 characters or fewer')
  );
  await assert.rejects(
    () => service.update({ id: 'sim-enabled', thumbnail: 's'.repeat(501) }),
    serviceError('BAD_REQUEST', 'Simulation thumbnail must be 500 characters or fewer')
  );
  await assert.rejects(
    () => service.update({ id: 'sim-enabled', grades: ['s'.repeat(21)] }),
    serviceError('BAD_REQUEST', 'Simulation grade must be 20 characters or fewer')
  );
});

class FakeSimulationsRepository {
  private readonly categories = [
    { id: 'physics', name: '物理', parentId: null },
    { id: 'physics-motion', name: '运动', parentId: 'physics' },
    { id: 'math', name: '数学', parentId: null },
  ];

  readonly rows: Row[] = [
    createRow({
      id: 'sim-enabled',
      name: 'Energy Skate Park',
      categoryId: 'physics-motion',
      categoryName: '运动',
      parentCategoryId: 'physics',
      parentCategoryName: '物理',
      isable: true,
      grades: ['中学', '高中'],
      topics: ['能量'],
      sampleLearningGoals: ['解释能量守恒'],
    }),
    createRow({
      id: 'sim-disabled',
      name: 'Disabled Circuit',
      categoryId: 'physics-motion',
      categoryName: '运动',
      parentCategoryId: 'physics',
      parentCategoryName: '物理',
      isable: false,
      grades: ['高中'],
    }),
    createRow({
      id: 'sim-root-category',
      name: 'Graphing Lines',
      categoryId: 'math',
      categoryName: '数学',
      parentCategoryId: null,
      parentCategoryName: null,
      isable: true,
      grades: ['大学'],
    }),
  ];

  asRepository(): SimulationsRepository {
    return this as unknown as SimulationsRepository;
  }

  async listNormalizedRows(): Promise<Row[]> {
    return this.rows;
  }

  async findCategoryById(
    id: string
  ): Promise<{ id: string; name: string; parentId: string | null } | null> {
    return this.categories.find((category) => category.id === id) ?? null;
  }

  async updateSimulation(input: {
    id: string;
    name?: string;
    categoryId?: string;
    grades?: string[];
    thumbnail?: string | null;
    src?: string | null;
    isable?: boolean;
    topics?: unknown[] | null;
    sampleLearningGoals?: unknown[] | null;
  }): Promise<Row | null> {
    const row = this.rows.find((item) => item.id === input.id);

    if (!row) {
      return null;
    }

    if (input.name !== undefined) {
      row.name = input.name;
    }
    if (input.categoryId !== undefined) {
      row.categoryId = input.categoryId;
    }
    if (input.grades !== undefined) {
      row.grades = input.grades;
    }
    if (input.thumbnail !== undefined) {
      row.thumbnail = input.thumbnail;
    }
    if (input.src !== undefined) {
      row.src = input.src;
    }
    if (input.isable !== undefined) {
      row.isable = input.isable;
    }
    if (input.topics !== undefined) {
      row.topics = input.topics;
    }
    if (input.sampleLearningGoals !== undefined) {
      row.sampleLearningGoals = input.sampleLearningGoals;
    }
    row.updatedAt = new Date('2026-05-19T00:00:01.000Z');

    return row;
  }
}

function serviceError(
  code: 'NOT_FOUND' | 'BAD_REQUEST',
  message: string
): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof SimulationsServiceError && error.code === code && error.message === message;
}

function createRow(input: {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  isable: boolean;
  grades: string[];
  topics?: unknown[] | null;
  sampleLearningGoals?: unknown[] | null;
}): Row {
  const now = new Date('2026-05-19T00:00:00.000Z');

  return {
    id: input.id,
    name: input.name,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    parentCategoryId: input.parentCategoryId,
    parentCategoryName: input.parentCategoryName,
    src: `${input.id}.html`,
    thumbnail: `${input.id}.png`,
    isable: input.isable,
    topics: input.topics ?? null,
    sampleLearningGoals: input.sampleLearningGoals ?? null,
    grades: input.grades,
    createdAt: now,
    updatedAt: now,
  };
}
