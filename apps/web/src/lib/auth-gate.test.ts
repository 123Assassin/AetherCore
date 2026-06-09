import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getLoggedOutRedirectPath,
  getLoginRequiredMessage,
  isUserSessionRequiredError,
} from './auth-gate';

test('getLoggedOutRedirectPath keeps anonymous users on root and redirects protected pages', () => {
  assert.equal(getLoggedOutRedirectPath('/'), null);
  assert.equal(getLoggedOutRedirectPath('/chat'), '/');
  assert.equal(getLoggedOutRedirectPath('/lesson/simulation'), '/');
  assert.equal(getLoggedOutRedirectPath('/office/comment'), '/');
});

test('isUserSessionRequiredError detects backend user session errors', () => {
  assert.equal(isUserSessionRequiredError(new Error('User session required')), true);
  assert.equal(isUserSessionRequiredError(new Error('AI 助手服务不可用，请稍后重试。')), false);
});

test('getLoginRequiredMessage returns a Chinese prompt', () => {
  assert.equal(getLoginRequiredMessage(), '请先登录后继续使用红笔AI。');
  assert.equal(getLoginRequiredMessage('chat'), '请先登录后再使用 AI 助手。');
});
