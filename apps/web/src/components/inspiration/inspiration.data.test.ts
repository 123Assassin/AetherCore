import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  availableInspirationSubjectsByGrade,
  defaultInspirationFormValues,
  featuredInspirationCases,
  getInspirationSubjectOptions,
  gradeOptions,
  normalizeInspirationSubjectForGrade,
} from './inspiration.data';

const configuredSubjectsByGrade: Record<string, readonly string[]> =
  availableInspirationSubjectsByGrade;

test('default inspiration form values use a configured agent classification', () => {
  assert.ok(
    configuredSubjectsByGrade[defaultInspirationFormValues.grade]?.includes(
      defaultInspirationFormValues.subject
    ),
    'default form values should use a configured inspiration agent classification'
  );
});

test('default inspiration subject uses the first subject of the default grade', () => {
  assert.equal(
    defaultInspirationFormValues.subject,
    getInspirationSubjectOptions(defaultInspirationFormValues.grade)[0]
  );
});

test('default inspiration grade is elementary', () => {
  assert.equal(defaultInspirationFormValues.grade, '小学');
});

test('inspiration grade options only expose abstract school stages', () => {
  assert.deepEqual(gradeOptions, ['小学', '初中']);
});

test('featured inspiration cases use configured agent classifications', () => {
  for (const item of featuredInspirationCases) {
    assert.ok(
      configuredSubjectsByGrade[item.grade]?.includes(item.subject),
      `${item.title} should use a configured inspiration agent classification`
    );
  }
});

test('inspiration subject options are linked to the selected grade', () => {
  assert.deepEqual(getInspirationSubjectOptions('小学'), [
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
  assert.equal(normalizeInspirationSubjectForGrade('小学', '化学'), '语文');
});
