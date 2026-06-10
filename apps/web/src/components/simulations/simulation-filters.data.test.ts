import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SimulationSubjectOption } from '@package/shared';

import {
  getNextCategoryFilterSelection,
  getNextSubjectFilterSelection,
  isSubjectFilterChecked,
} from './simulation-filters.data';

const physicsSubject: SimulationSubjectOption = {
  name: '物理',
  categories: [
    { id: '物理-运动', name: '运动' },
    { id: '物理-光和辐射', name: '光和辐射' },
  ],
};

test('selecting a child category checks its parent subject visually', () => {
  const next = getNextCategoryFilterSelection(physicsSubject, '物理-运动', {
    selectedCategoryIds: [],
    selectedSubjects: [],
  });

  assert.deepEqual(next, {
    selectedCategoryIds: ['物理-运动'],
    selectedSubjects: [],
  });
  assert.equal(isSubjectFilterChecked(physicsSubject, next), true);
});

test('selecting a parent subject selects all child categories', () => {
  assert.deepEqual(
    getNextSubjectFilterSelection(physicsSubject, {
      selectedCategoryIds: ['物理-运动'],
      selectedSubjects: [],
    }),
    {
      selectedCategoryIds: ['物理-运动', '物理-光和辐射'],
      selectedSubjects: ['物理'],
    }
  );
});

test('selecting every child category marks the parent subject as fully selected', () => {
  assert.deepEqual(
    getNextCategoryFilterSelection(physicsSubject, '物理-光和辐射', {
      selectedCategoryIds: ['物理-运动'],
      selectedSubjects: [],
    }),
    {
      selectedCategoryIds: ['物理-运动', '物理-光和辐射'],
      selectedSubjects: ['物理'],
    }
  );
});

test('clearing a selected parent subject clears all child categories', () => {
  assert.deepEqual(
    getNextSubjectFilterSelection(physicsSubject, {
      selectedCategoryIds: ['物理-运动', '物理-光和辐射'],
      selectedSubjects: ['物理'],
    }),
    {
      selectedCategoryIds: [],
      selectedSubjects: [],
    }
  );
});
