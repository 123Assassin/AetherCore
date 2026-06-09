import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getTeachingSubjectOptions,
  normalizeTeachingSubjectForStage,
  teachingStageOptions,
} from './teaching.data';

test('teaching stage options only expose abstract school stages', () => {
  assert.deepEqual(teachingStageOptions, ['小学', '初中']);
});

test('teaching subject options are linked to the selected stage', () => {
  assert.deepEqual(getTeachingSubjectOptions('小学'), [
    '语文',
    '数学',
    '英语',
    '道德与法治',
    '科学',
    '体育与健康',
    '音乐',
    '美术',
    '综合实践活动',
    '劳动',
  ]);
  assert.equal(normalizeTeachingSubjectForStage('小学', '化学'), '语文');
});
