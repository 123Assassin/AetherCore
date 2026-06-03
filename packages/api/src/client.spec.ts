import assert from 'node:assert/strict';
import test from 'node:test';

import { initTRPC } from '@trpc/server';

import { createApiClient } from './client.js';

const t = initTRPC.create();

const testRouter = t.router({
  first: t.procedure.query(() => 'first'),
  second: t.procedure.query(() => 'second'),
});

test('createApiClient sends parallel calls as separate tRPC requests', async () => {
  assert.ok(testRouter);

  const requestedUrls: string[] = [];
  const client = createApiClient<typeof testRouter>('http://api.test', {
    fetch: async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      const isBatchRequest = url.includes('batch=1');
      const body = isBatchRequest
        ? [{ result: { data: 'ok' } }, { result: { data: 'ok' } }]
        : { result: { data: 'ok' } };

      return new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    },
  });

  await Promise.all([client.first.query(), client.second.query()]);

  assert.equal(requestedUrls.length, 2);
  assert.ok(
    requestedUrls.every((url) => !url.includes('/trpc/first,second')),
    requestedUrls.join('\n')
  );
});
