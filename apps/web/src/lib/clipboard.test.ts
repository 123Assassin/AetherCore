import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { copyTextToClipboard } from './clipboard';

test('copyTextToClipboard uses navigator clipboard when available', async () => {
  let copiedText = '';

  const result = await copyTextToClipboard('hello', {
    clipboard: {
      writeText: async (text) => {
        copiedText = text;
      },
    },
  });

  assert.equal(result, true);
  assert.equal(copiedText, 'hello');
});

test('copyTextToClipboard falls back to a temporary textarea when browser clipboard is missing', async () => {
  let selected = false;
  const appended: unknown[] = [];
  const removed: unknown[] = [];

  const result = await copyTextToClipboard('fallback text', {
    document: {
      body: {
        appendChild: (element) => {
          appended.push(element);
        },
        removeChild: (element) => {
          removed.push(element);
        },
      },
      createElement: () => ({
        select: () => {
          selected = true;
        },
        setAttribute: () => undefined,
        style: {},
        value: '',
      }),
      execCommand: (command) => command === 'copy',
    },
  });

  assert.equal(result, true);
  assert.equal(selected, true);
  assert.equal(appended.length, 1);
  assert.equal(removed.length, 1);
});

test('copyTextToClipboard falls back when navigator clipboard rejects', async () => {
  let fallbackUsed = false;

  const result = await copyTextToClipboard('fallback text', {
    clipboard: {
      writeText: async () => {
        throw new Error('NotAllowedError');
      },
    },
    document: {
      body: {
        appendChild: () => undefined,
        removeChild: () => undefined,
      },
      createElement: () => ({
        select: () => undefined,
        setAttribute: () => undefined,
        style: {},
        value: '',
      }),
      execCommand: (command) => {
        fallbackUsed = true;
        return command === 'copy';
      },
    },
  });

  assert.equal(result, true);
  assert.equal(fallbackUsed, true);
});

test('copyTextToClipboard focuses and range-selects the fallback textarea before copying', async () => {
  const calls: string[] = [];

  const result = await copyTextToClipboard('windows fallback text', {
    clipboard: {
      writeText: async () => {
        throw new Error('NotAllowedError');
      },
    },
    document: {
      body: {
        appendChild: () => undefined,
        removeChild: () => undefined,
      },
      createElement: () => ({
        focus: () => {
          calls.push('focus');
        },
        select: () => {
          calls.push('select');
        },
        setAttribute: () => undefined,
        setSelectionRange: (start, end) => {
          calls.push(`range:${start}-${end}`);
        },
        style: {},
        value: '',
      }),
      execCommand: (command) => {
        calls.push(`exec:${command}`);
        return command === 'copy';
      },
    },
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ['focus', 'select', 'range:0-21', 'exec:copy']);
});
