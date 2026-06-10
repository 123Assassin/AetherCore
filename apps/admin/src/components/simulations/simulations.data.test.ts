import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SimulationItem } from '@package/shared';

import { getAdminSimulationGradeOptions, getSimulationSubjectLabels } from './simulations.data';

test('getSimulationSubjectLabels returns unique subject badges from subject assignments', () => {
  assert.deepEqual(
    getSimulationSubjectLabels(
      createSimulationItem({
        subject: '物理',
        subjects: [
          { subject: '物理', category: { id: '物理-运动', name: '运动' } },
          { subject: '数学', category: { id: '数学-数学概念', name: '数学概念' } },
          { subject: '物理', category: { id: '物理-力学', name: '力学' } },
        ],
      })
    ),
    ['物理', '数学']
  );
});

test('getSimulationSubjectLabels falls back to the legacy subject field', () => {
  assert.deepEqual(
    getSimulationSubjectLabels(createSimulationItem({ subject: '化学', subjects: [] })),
    ['化学']
  );
});

test('getAdminSimulationGradeOptions only keeps elementary and middle school grades', () => {
  assert.deepEqual(getAdminSimulationGradeOptions(['一年级', '小学', '中学', '大学']), [
    '小学',
    '中学',
  ]);
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
