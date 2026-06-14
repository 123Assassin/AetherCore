import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getDefaultTeachingSubjectForStage,
  getTeachingSubjectOptions,
  normalizeTeachingSubjectForStage,
} from '../components/teaching/teaching.data';

test('teaching subject options are temporarily limited to math and Chinese', () => {
  assert.deepEqual(getTeachingSubjectOptions('小学'), ['数学', '语文']);
  assert.deepEqual(getTeachingSubjectOptions('初中'), ['数学', '语文']);
  assert.equal(getDefaultTeachingSubjectForStage('小学'), '数学');
  assert.equal(normalizeTeachingSubjectForStage('小学', '语文'), '语文');
  assert.equal(normalizeTeachingSubjectForStage('小学', '英语'), '数学');
});
