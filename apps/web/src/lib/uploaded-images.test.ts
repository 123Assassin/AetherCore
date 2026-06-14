import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { readUploadedImages } from './uploaded-images';

test('readUploadedImages uploads image files through the web upload endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const file = new File([Buffer.from('png-bytes')], 'question.png', { type: 'image/png' });
  const calls: Array<{ body: FormData; url: string }> = [];

  globalThis.fetch = (async (input, init) => {
    calls.push({ body: init?.body as FormData, url: String(input) });

    return new Response(
      JSON.stringify({
        mimeType: 'image/png',
        name: 'question.png',
        size: 9,
        url: 'https://files.example.test/uploads/ai-images/question.png',
      }),
      { headers: { 'content-type': 'application/json' }, status: 200 }
    );
  }) as typeof fetch;

  try {
    const result = await readUploadedImages({ 0: file, length: 1 });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, '/api/uploads/images');
    assert.equal(calls[0]?.body.get('file'), file);
    assert.deepEqual(result, [
      {
        mimeType: 'image/png',
        name: 'question.png',
        size: 9,
        url: 'https://files.example.test/uploads/ai-images/question.png',
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
