import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  expandWebGradeFilters,
  getDefaultWebSubjectForGrade,
  getWebSubjectsForGrade,
  normalizeWebGradeOptions,
  normalizeWebSubjectForGrade,
} from './web-grades';

test('normalizeWebGradeOptions maps detailed grades to abstract web grades', () => {
  assert.deepEqual(
    normalizeWebGradeOptions(['三年级', '小学', '七年级', '中学', '初中', '高中', '大学']),
    ['小学', '初中']
  );
});

test('expandWebGradeFilters keeps abstract web filters compatible with detailed backend grades', () => {
  assert.deepEqual(expandWebGradeFilters(['小学']), [
    '小学',
    '一年级',
    '二年级',
    '三年级',
    '四年级',
    '五年级',
    '六年级',
  ]);
  assert.deepEqual(expandWebGradeFilters(['初中']), ['初中', '七年级', '八年级', '九年级', '中学']);
});

test('getWebSubjectsForGrade returns the configured elementary subjects', () => {
  assert.deepEqual(getWebSubjectsForGrade('小学'), [
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
});

test('getWebSubjectsForGrade returns the configured middle school subjects', () => {
  assert.deepEqual(getWebSubjectsForGrade('初中'), [
    '语文',
    '数学',
    '英语',
    '道德与法治',
    '历史',
    '地理',
    '生物',
    '物理',
    '化学',
    '体育与健康',
    '音乐',
    '美术',
    '信息技术',
    '综合实践活动',
    '劳动',
    '心理健康',
    '安全教育',
  ]);
});

test('normalizeWebSubjectForGrade keeps valid subjects and falls back to the first grade subject', () => {
  assert.equal(normalizeWebSubjectForGrade('小学', '数学'), '数学');
  assert.equal(normalizeWebSubjectForGrade('小学', '化学'), '语文');
  assert.equal(normalizeWebSubjectForGrade('初中', '科学'), '语文');
});

test('getDefaultWebSubjectForGrade returns the first subject for the selected grade', () => {
  assert.equal(getDefaultWebSubjectForGrade('小学'), '语文');
  assert.equal(getDefaultWebSubjectForGrade('初中'), '语文');
});
