import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { commentGradeOptions } from './comment-tags.data';

test('comment grade options only expose abstract school stages', () => {
  assert.deepEqual(commentGradeOptions, ['小学', '初中']);
});
