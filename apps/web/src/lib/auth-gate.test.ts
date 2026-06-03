import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getLoginRequiredMessage,
  getLoggedOutRedirectPath,
  isUserSessionRequiredError,
} from './auth-gate';

test('getLoggedOutRedirectPath keeps anonymous users on chat and redirects protected pages', () => {
  assert.equal(getLoggedOutRedirectPath('/chat'), null);
  assert.equal(getLoggedOutRedirectPath('/lesson/simulation'), '/chat');
  assert.equal(getLoggedOutRedirectPath('/office/comment'), '/chat');
});

test('isUserSessionRequiredError detects backend user session errors', () => {
  assert.equal(isUserSessionRequiredError(new Error('User session required')), true);
  assert.equal(isUserSessionRequiredError(new Error('AI 助手服务不可用，请稍后重试。')), false);
});

test('getLoginRequiredMessage returns a Chinese prompt', () => {
  assert.equal(getLoginRequiredMessage(), '请先登录后继续使用红笔AI。');
  assert.equal(getLoginRequiredMessage('chat'), '请先登录后再使用 AI 助手。');
});
