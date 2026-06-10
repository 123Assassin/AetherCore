import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { simulationApps } from '@package/db/schema';

import { buildSeedRows, loadSeedSource } from './seed-data.js';

describe('simulation seed data', () => {
  it('uses a runtime db schema that includes simulation subjects', () => {
    assert.equal(Boolean(simulationApps.subjects), true);
  });

  it('loads data.json and grade.json from the db-init package', async () => {
    const source = await loadSeedSource();

    assert.deepEqual(Object.keys(source.gradeGroups).sort(), ['中学', '小学']);
    assert.deepEqual(Object.keys(source.grades).sort(), ['中学', '小学']);
  });

  it('expands source files into simulation seed rows', async () => {
    const rows = buildSeedRows(await loadSeedSource());

    assert.equal(rows.categories.length, 18);
    assert.equal(rows.apps.length, 73);
    assert.equal(rows.grades.length, 2);
    assert.equal(rows.gradeSimulationApps.length, 111);
    assert.equal(rows.apps[0]?.isable, true);

    const density = rows.apps.find((app) => app.id === 'density');
    assert.equal(density?.categoryId, '化学-普通化学');
    assert.deepEqual(density?.subjects, [
      { subject: '化学', category: '普通化学' },
      { subject: '地理', category: '地球科学' },
      { subject: '生物', category: '生物科学' },
    ]);
    assert.deepEqual(
      rows.gradeSimulationApps.filter((row) => row.simulationAppId === 'density'),
      [
        { gradeName: '小学', simulationAppId: 'density' },
        { gradeName: '中学', simulationAppId: 'density' },
      ]
    );
  });

  it('deduplicates the same source app across grade groups', () => {
    const rows = buildSeedRows({
      gradeGroups: {
        Grade1: [
          {
            id: 'pendulum-lab',
            name: 'Pendulum Lab',
            subjects: [{ subject: 'Science', category: 'Motion' }],
          },
        ],
        Grade2: [
          {
            id: 'pendulum-lab',
            name: 'Pendulum Lab',
            subjects: [{ subject: 'Science', category: 'Motion' }],
          },
        ],
      },
      grades: {
        Grade1: ['Pendulum Lab'],
        Grade2: ['Pendulum Lab'],
      },
    });

    assert.deepEqual(
      rows.apps.map((app) => app.id),
      ['pendulum-lab']
    );
    assert.equal(rows.apps[0]?.categoryId, 'Science-Motion');
    assert.deepEqual(rows.apps[0]?.subjects, [{ subject: 'Science', category: 'Motion' }]);
    assert.deepEqual(rows.gradeSimulationApps, [
      { gradeName: 'Grade1', simulationAppId: 'pendulum-lab' },
      { gradeName: 'Grade2', simulationAppId: 'pendulum-lab' },
    ]);
  });
});
