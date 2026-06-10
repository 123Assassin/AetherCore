import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'apps/server/package.json'), 'utf8')
) as {
  scripts: Record<string, string | undefined>;
};

test('server runtime scripts build the db package before loading runtime schema', () => {
  assert.match(readScript('build'), /@package\/db build/);
  assert.match(readScript('dev'), /@package\/db build/);
  assert.match(readScript('start'), /@package\/db build/);
});

function readScript(name: string) {
  const script = packageJson.scripts[name];

  if (typeof script !== 'string') {
    throw new Error(`Missing server package script: ${name}`);
  }

  return script;
}
