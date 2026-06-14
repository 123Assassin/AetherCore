import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveBatchCommentSimilarityWarnings } from './batch-comment-similarity';

test('deriveBatchCommentSimilarityWarnings flags highly repeated successful comments', () => {
  const warnings = deriveBatchCommentSimilarityWarnings(
    [
      {
        comments: ['这位同学课堂表现稳定，学习态度认真，能够积极完成任务。'],
        id: 'row-1',
        rowIndex: 1,
        status: 'success',
      },
      {
        comments: ['这位同学课堂表现稳定，学习态度认真，能够积极完成任务!'],
        id: 'row-2',
        rowIndex: 2,
        status: 'success',
      },
    ],
    0.85
  );

  assert.equal(warnings.get('row-2'), '与第 1 行相似度过高');
});

test('deriveBatchCommentSimilarityWarnings ignores clearly different comments', () => {
  const warnings = deriveBatchCommentSimilarityWarnings(
    [
      {
        comments: ['这位同学善于表达，课堂讨论中经常提出有启发的问题。'],
        id: 'row-1',
        rowIndex: 1,
        status: 'success',
      },
      {
        comments: ['这位同学体育活动积极，能主动协助同伴完成小组任务。'],
        id: 'row-2',
        rowIndex: 2,
        status: 'success',
      },
    ],
    0.85
  );

  assert.equal(warnings.size, 0);
});

test('deriveBatchCommentSimilarityWarnings uses edited first comment content only', () => {
  const warnings = deriveBatchCommentSimilarityWarnings(
    [
      {
        comments: ['原始第一条', '这段备用候选内容和下一行完全相同'],
        id: 'row-1',
        rowIndex: 1,
        status: 'success',
      },
      {
        comments: ['这段备用候选内容和下一行完全相同'],
        id: 'row-2',
        rowIndex: 2,
        status: 'success',
      },
    ],
    0.85
  );

  assert.equal(warnings.size, 0);
});
