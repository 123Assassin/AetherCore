import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('admin simulations page keeps the default card grid without layout switch controls', () => {
  const source = readSource('../app/(admin)/simulations/page.tsx');

  assert.doesNotMatch(source, /LayoutGrid/);
  assert.doesNotMatch(source, /ListIcon/);
  assert.doesNotMatch(source, /卡片视图/);
  assert.doesNotMatch(source, /列表视图/);
});

test('admin simulation cards reuse the web thumbnail route and omit the trailing settings icon', () => {
  const source = readSource('../components/simulations/simulation-card.tsx');

  assert.match(source, /resolveSimulationThumbnailUrl/);
  assert.doesNotMatch(source, /src=\{item\.thumbnail\}/);
  assert.doesNotMatch(source, /Settings2/);
});

test('admin simulation cards render subject badges from the subjects field', () => {
  const source = readSource('../components/simulations/simulation-card.tsx');

  assert.match(source, /getSimulationSubjectLabels\(item\)/);
  assert.doesNotMatch(source, /item\.subject\}\s*\/\s*\{item\.category\.name/);
});

test('admin simulation grade tree only renders elementary and middle school filters', () => {
  const source = readSource('../components/simulations/simulation-tree-filter.tsx');

  assert.match(source, /getAdminSimulationGradeOptions\(filters\.grades\)\.map/);
  assert.doesNotMatch(source, /filters\.grades\.map/);
});

test('admin exposes the bundled simulation thumbnail route', () => {
  const source = readSource('../app/simulation-thumbnails/[filename]/route.ts');

  assert.match(source, /phetsims_thumbnail/);
  assert.match(source, /Simulation thumbnail not found/);
});
