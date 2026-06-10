import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('web simulation cards open a detail dialog instead of showing an immediate-start hover CTA', () => {
  const source = readSource('../components/simulations/simulation-card.tsx');

  assert.doesNotMatch(source, /立即开始/);
  assert.doesNotMatch(source, /HTML5 支持/);
  assert.doesNotMatch(source, /description/);
  assert.doesNotMatch(source, /ExternalLink/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /thumbnailUrl/);
  assert.match(source, /打开仿真程序/);
  assert.match(source, /名称/);
  assert.match(source, /标题/);
  assert.match(source, /学习目标/);
});

test('web simulation card subject badges come from the subjects field', () => {
  const source = readSource('../components/simulations/simulation-card.tsx');

  assert.match(source, /getSimulationSubjectLabels\(item\)/);
  assert.doesNotMatch(source, /\{item\.subject\}/);
});

test('web simulation card keeps grade badges on the thumbnail top right', () => {
  const source = readSource('../components/simulations/simulation-card.tsx');

  assert.match(source, /absolute top-4 right-4/);
  assert.doesNotMatch(source, /border-t border-slate-50 pt-4/);
});
