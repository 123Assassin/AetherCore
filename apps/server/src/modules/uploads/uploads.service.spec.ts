import * as assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { UploadsService, UploadsServiceError } from './uploads.service.js';

test('saveImage writes an uploaded image into the configured upload directory', async () => {
  const uploadRoot = await mkdtemp(join(tmpdir(), 'aether-upload-'));
  const service = new UploadsService({
    publicBaseUrl: 'https://files.example.test',
    uploadDir: uploadRoot,
  });

  try {
    const result = await service.saveImage({
      buffer: Buffer.from('png-bytes'),
      fileName: 'question.png',
      mimeType: 'image/png',
    });

    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.name, 'question.png');
    assert.equal(result.size, 9);
    assert.match(result.url, /^https:\/\/files\.example\.test\/uploads\/ai-images\//);
    assert.match(result.url, /\.png$/);
    assert.equal(await readFile(join(uploadRoot, result.storagePath), 'utf8'), 'png-bytes');
  } finally {
    await rm(uploadRoot, { force: true, recursive: true });
  }
});

test('saveImage rejects non-image uploads before writing files', async () => {
  const uploadRoot = await mkdtemp(join(tmpdir(), 'aether-upload-'));
  const service = new UploadsService({
    publicBaseUrl: 'https://files.example.test',
    uploadDir: uploadRoot,
  });

  try {
    await assert.rejects(
      () =>
        service.saveImage({
          buffer: Buffer.from('plain text'),
          fileName: 'note.txt',
          mimeType: 'text/plain',
        }),
      (error) => {
        assert.equal(error instanceof UploadsServiceError, true);
        assert.equal((error as UploadsServiceError).code, 'BAD_REQUEST');
        assert.equal((error as UploadsServiceError).message, 'Only image uploads are supported');

        return true;
      }
    );
  } finally {
    await rm(uploadRoot, { force: true, recursive: true });
  }
});
