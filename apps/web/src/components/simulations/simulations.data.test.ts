import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SimulationItem } from '@package/shared';

import {
  getSimulationLearningGoals,
  getSimulationSubjectLabels,
  getSimulationTopics,
} from './simulations.data';

test('getSimulationSubjectLabels uses item subject assignments before legacy subject', () => {
  assert.deepEqual(
    getSimulationSubjectLabels(
      createSimulationItem({
        subject: '物理',
        subjects: [
          { subject: '化学', category: { id: '化学-普通化学', name: '普通化学' } },
          { subject: '地理', category: { id: '地理-地球科学', name: '地球科学' } },
          { subject: '化学', category: { id: '化学-普通化学', name: '普通化学' } },
        ],
      })
    ),
    ['化学', '地理']
  );
});

test('getSimulationSubjectLabels falls back to the legacy subject field', () => {
  assert.deepEqual(
    getSimulationSubjectLabels(createSimulationItem({ subject: '数学', subjects: [] })),
    ['数学']
  );
});

test('getSimulationSubjectLabels keeps every subject covered by a simulation', () => {
  assert.deepEqual(
    getSimulationSubjectLabels(
      createSimulationItem({
        id: 'balancing-act',
        name: '平衡探究实验',
        subject: '物理',
        subjects: [
          { subject: '物理', category: { id: '物理-运动', name: '运动' } },
          { subject: '数学', category: { id: '数学-数学的应用', name: '数学的应用' } },
        ],
      })
    ),
    ['物理', '数学']
  );
});

test('getSimulationTopics and getSimulationLearningGoals normalize modal detail arrays', () => {
  const item = createSimulationItem({
    topics: ['密度', { topic: '质量' }, ['阿基米德原理']],
    sampleLearningGoals: ['理解密度', { goal: '比较材料' }, ['测量体积']],
  });

  assert.deepEqual(getSimulationTopics(item), ['密度', '质量', '阿基米德原理']);
  assert.deepEqual(getSimulationLearningGoals(item), ['理解密度', '比较材料', '测量体积']);
});

function createSimulationItem(input: Partial<SimulationItem> = {}): SimulationItem {
  const now = new Date('2026-06-10T00:00:00.000Z').toISOString();

  return {
    id: 'density',
    name: '密度',
    subject: '物理',
    subjects: [],
    category: { id: '物理-运动', name: '运动' },
    grades: ['中学'],
    thumbnail: 'density.png',
    src: 'density_en.html',
    isable: true,
    topics: null,
    sampleLearningGoals: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}
