import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('comment result copy sanitizes markdown code fences before writing to clipboard', () => {
  const source = readSource('./comment-result-list.tsx');

  assert.match(source, /getCommentCopyText\(comment\)/);
  assert.doesNotMatch(source, /copyTextToClipboard\(comment\)/);
});
