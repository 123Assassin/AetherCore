import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveSimulationAppBaseUrl,
  resolveSimulationAppUrl,
  resolveSimulationAssetUrl,
  resolveSimulationThumbnailUrl,
} from './simulation-assets';

test('resolveSimulationAssetUrl joins a configured base URL with a file name', () => {
  assert.equal(
    resolveSimulationAssetUrl('collision-lab.png', 'https://static.example.com/thumbs/'),
    'https://static.example.com/thumbs/collision-lab.png'
  );
  assert.equal(
    resolveSimulationAssetUrl('collision-lab_en.html', 'https://static.example.com/sims'),
    'https://static.example.com/sims/collision-lab_en.html'
  );
});

test('resolveSimulationAssetUrl keeps existing absolute URLs and root-relative paths', () => {
  assert.equal(
    resolveSimulationAssetUrl('https://cdn.example.com/collision-lab.png', 'https://ignored.test'),
    'https://cdn.example.com/collision-lab.png'
  );
  assert.equal(
    resolveSimulationAssetUrl('/assets/collision-lab.png', 'https://ignored.test'),
    '/assets/collision-lab.png'
  );
});

test('resolveSimulationAssetUrl returns null for empty source values', () => {
  assert.equal(resolveSimulationAssetUrl(null, 'https://static.example.com'), null);
  assert.equal(resolveSimulationAssetUrl('   ', 'https://static.example.com'), null);
});

test('resolveSimulationThumbnailUrl always uses the bundled thumbnail route', () => {
  assert.equal(
    resolveSimulationThumbnailUrl('collision-lab.png'),
    '/simulation-thumbnails/collision-lab.png'
  );
});

test('resolveSimulationAppBaseUrl uses the current host with the configured simulation port', () => {
  assert.equal(
    resolveSimulationAppBaseUrl({ hostname: 'vps.example.com', port: '8080' }),
    'http://vps.example.com:8080'
  );
});

test('resolveSimulationAppUrl opens simulations through host and port', () => {
  assert.equal(
    resolveSimulationAppUrl('ph-scale_en.html', { hostname: 'vps.example.com', port: '8080' }),
    'http://vps.example.com:8080/ph-scale/ph-scale_en.html'
  );
});
