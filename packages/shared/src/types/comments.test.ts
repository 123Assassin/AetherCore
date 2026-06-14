import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { COMMENT_GRADES } from './index.js';

test('comment grades expose detailed first through ninth grade options', () => {
  assert.deepEqual(COMMENT_GRADES, [
    '一年级',
    '二年级',
    '三年级',
    '四年级',
    '五年级',
    '六年级',
    '七年级',
    '八年级',
    '九年级',
  ]);
});
