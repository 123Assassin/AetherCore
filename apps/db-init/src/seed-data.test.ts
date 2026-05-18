import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSeedRows, loadSeedSource } from './seed-data.js';

describe('simulation seed data', () => {
  it('loads data.json and grade.json from the db-init package', async () => {
    const source = await loadSeedSource();

    assert.equal(source.subjects.length, 5);
    assert.equal(Object.keys(source.grades).length, 4);
  });

  it('expands source files into simulation seed rows', async () => {
    const rows = buildSeedRows(await loadSeedSource());

    assert.equal(rows.categories.length, 18);
    assert.equal(rows.apps.length, 147);
    assert.equal(rows.grades.length, 4);
    assert.equal(rows.gradeSimulationApps.length > 0, true);
    assert.equal(rows.apps[0]?.isable, true);
  });

  it('generates unique app ids when the same source app appears in multiple categories', () => {
    const rows = buildSeedRows({
      subjects: [
        {
          id: 'science',
          name: 'Science',
          children: [
            {
              id: 'motion',
              name: 'Motion',
              children: [{ id: 'pendulum-lab', name: 'Pendulum Lab' }],
            },
            {
              id: 'energy',
              name: 'Energy',
              children: [{ id: 'pendulum-lab', name: 'Pendulum Lab' }],
            },
          ],
        },
      ],
      grades: {
        Grade1: ['Pendulum Lab'],
      },
    });

    assert.deepEqual(
      rows.apps.map((app) => app.id),
      ['Science-motion-pendulum-lab', 'Science-energy-pendulum-lab']
    );
    assert.deepEqual(rows.gradeSimulationApps, [
      { gradeName: 'Grade1', simulationAppId: 'Science-motion-pendulum-lab' },
      { gradeName: 'Grade1', simulationAppId: 'Science-energy-pendulum-lab' },
    ]);
  });
});
