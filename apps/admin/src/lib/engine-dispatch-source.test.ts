import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('engine dispatch form exposes engine category controls', () => {
  const formSource = readSource('../components/engines/engine-form-dialog.tsx');
  const tableSource = readSource('../components/engines/engine-table.tsx');

  assert.match(formSource, /adminModelEngineCategories/);
  assert.match(formSource, /引擎类别/);
  assert.match(formSource, /reasoning: '推理引擎'/);
  assert.match(formSource, /vision: '视觉引擎'/);
  assert.match(tableSource, /categoryLabels\[item\.category\]/);
});

test('agent form only shows reasoning engines for agent binding', () => {
  const formSource = readSource('../components/resources/agent-form-dialog.tsx');

  assert.match(formSource, /engine\.category === 'reasoning'/);
  assert.match(formSource, /reasoningEngines\.map/);
});
