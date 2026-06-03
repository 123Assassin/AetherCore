import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  type AdminAgentKey,
  adminAgentKeys,
  type AiConversationCategory,
  getAdminAgentClassificationMode,
  getAdminAgentGradeOptions,
  normalizeAdminAgentGradeClassification,
  WEB_AGENT_MAPPING,
  webAgentKeys,
} from './index.js';

test('web agent mapping is the single source for web and admin agent keys', () => {
  assert.deepEqual(webAgentKeys, ['chat', 'inspiration', 'comment', 'teaching']);
  assert.deepEqual(adminAgentKeys, webAgentKeys);

  const categories = webAgentKeys.map((key) => WEB_AGENT_MAPPING[key].category);
  const adminKeys = webAgentKeys.map((key) => WEB_AGENT_MAPPING[key].adminAgentKey);

  assert.deepEqual(categories, webAgentKeys satisfies AiConversationCategory[]);
  assert.deepEqual(adminKeys, adminAgentKeys satisfies AdminAgentKey[]);
});

test('web agent mapping exposes product-facing agent names', () => {
  assert.equal(WEB_AGENT_MAPPING.chat.name, 'AI 助手智能体');
  assert.equal(WEB_AGENT_MAPPING.inspiration.name, '知识精讲智能体');
  assert.equal(WEB_AGENT_MAPPING.comment.name, '学生评语智能体');
  assert.equal(WEB_AGENT_MAPPING.teaching.name, '题目变身智能体');
});

test('admin agent classification follows current resource rules', () => {
  assert.equal(getAdminAgentClassificationMode('comment'), 'grade');
  assert.equal(getAdminAgentClassificationMode('inspiration'), 'gradeSubject');
  assert.equal(getAdminAgentClassificationMode('teaching'), 'gradeSubject');

  assert.deepEqual(getAdminAgentGradeOptions('comment'), ['小学', '初中']);
  assert.deepEqual(getAdminAgentGradeOptions('inspiration'), ['小学', '初中']);
  assert.deepEqual(getAdminAgentGradeOptions('teaching'), ['小学', '初中']);
});

test('admin agent grade classification normalizes detailed web grades', () => {
  assert.equal(normalizeAdminAgentGradeClassification('comment', '三年级'), '小学');
  assert.equal(normalizeAdminAgentGradeClassification('teaching', '七年级'), '初中');
  assert.equal(normalizeAdminAgentGradeClassification('inspiration', ' 高中 '), null);
  assert.equal(normalizeAdminAgentGradeClassification('chat', '小学'), null);
});
