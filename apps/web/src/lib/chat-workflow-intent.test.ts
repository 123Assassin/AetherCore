import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createChatWorkflowIntentAction,
  createChatWorkflowIntentReply,
  resolveChatWorkflowIntent,
} from './chat-workflow-intent';

test('resolveChatWorkflowIntent routes comment requests locally', () => {
  assert.equal(resolveChatWorkflowIntent('帮我写个评语'), '/office/comment');
  assert.equal(resolveChatWorkflowIntent('我想写一份期末评语'), '/office/comment');
});

test('resolveChatWorkflowIntent routes lesson preparation requests locally', () => {
  assert.equal(resolveChatWorkflowIntent('我想备课'), '/lesson/inspiration');
  assert.equal(resolveChatWorkflowIntent('帮我找点备课灵感'), '/lesson/inspiration');
});

test('resolveChatWorkflowIntent routes teaching transformation requests locally', () => {
  assert.equal(resolveChatWorkflowIntent('做一个题目变身'), '/office/teaching');
  assert.equal(resolveChatWorkflowIntent('帮我改编一道变式题'), '/office/teaching');
});

test('resolveChatWorkflowIntent leaves general chat on the AI assistant', () => {
  assert.equal(resolveChatWorkflowIntent('如何处理课堂上的突发情况？'), null);
  assert.equal(resolveChatWorkflowIntent('今天的课堂纪律怎么管理'), null);
});

test('createChatWorkflowIntentReply returns the configured local workflow message', () => {
  assert.equal(
    createChatWorkflowIntentReply('/office/comment'),
    '需要使用专业教学助手功能吗，点击评语助手直达。'
  );
  assert.deepEqual(createChatWorkflowIntentAction('/office/comment'), {
    href: '/office/comment',
    label: '评语助手',
  });
});
