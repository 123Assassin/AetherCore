import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { getCommentCopyText } from './comment-copy.data';

test('getCommentCopyText removes markdown fenced code wrappers', () => {
  assert.equal(
    getCommentCopyText('```markdown\n张三同学学习认真，课堂表现积极。\n```'),
    '张三同学学习认真，课堂表现积极。'
  );
});

test('getCommentCopyText removes fenced code markers without dropping comment text', () => {
  assert.equal(
    getCommentCopyText('评语如下：\n```\n李同学能主动思考，表达清晰。\n```\n请参考。'),
    '评语如下：\n李同学能主动思考，表达清晰。\n请参考。'
  );
});

test('getCommentCopyText removes alternate markdown fence markers', () => {
  assert.equal(
    getCommentCopyText('~~~text\n王同学能保持专注，作业完成质量稳定。\n~~~'),
    '王同学能保持专注，作业完成质量稳定。'
  );
});
