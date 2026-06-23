import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { Inject, Injectable, Optional } from '@nestjs/common';

export type UploadedImageResult = {
  mimeType: string;
  name: string;
  size: number;
  storagePath: string;
  url: string;
};

export type SaveImageInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

type UploadsServiceConfig = {
  publicBaseUrl?: string;
  uploadDir?: string;
};

export const UPLOADS_SERVICE_CONFIG = 'UPLOADS_SERVICE_CONFIG';
const DEFAULT_PUBLIC_BASE_URL = 'http://localhost:8000';
const DEFAULT_UPLOAD_DIR = '../../uploads';
const IMAGE_ROOT = 'ai-images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const mimeExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export class UploadsServiceError extends Error {
  constructor(
    public readonly code: 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR',
    message: string
  ) {
    super(message);
  }
}

@Injectable()
export class UploadsService {
  private readonly publicBaseUrl: string;
  private readonly uploadDir: string;

  constructor(
    @Optional()
    @Inject(UPLOADS_SERVICE_CONFIG)
    config: UploadsServiceConfig = {}
  ) {
    this.publicBaseUrl = normalizePublicBaseUrl(
      config.publicBaseUrl ?? process.env.FILE_PUBLIC_BASE_URL ?? DEFAULT_PUBLIC_BASE_URL
    );
    this.uploadDir = resolve(config.uploadDir ?? process.env.FILE_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR);
  }

  async saveImage(input: SaveImageInput): Promise<UploadedImageResult> {
    const mimeType = input.mimeType.trim().toLowerCase();
    const extension = mimeExtensions.get(mimeType);

    if (!extension) {
      throw new UploadsServiceError('BAD_REQUEST', 'Only image uploads are supported');
    }

    if (input.buffer.length === 0) {
      throw new UploadsServiceError('BAD_REQUEST', 'Uploaded image is empty');
    }

    if (input.buffer.length > MAX_IMAGE_BYTES) {
      throw new UploadsServiceError('BAD_REQUEST', 'Uploaded image is too large');
    }

    const storagePath = createStoragePath(input.fileName, extension);
    const absolutePath = resolve(this.uploadDir, storagePath);

    ensureInsideUploadDir(this.uploadDir, absolutePath);
    await mkdir(resolve(absolutePath, '..'), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      mimeType,
      name: normalizeOriginalName(input.fileName),
      size: input.buffer.length,
      storagePath,
      url: `${this.publicBaseUrl}/uploads/${storagePath.split(sep).join('/')}`,
    };
  }
}

function createStoragePath(fileName: string, fallbackExtension: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const extension = normalizeExtension(extname(fileName)) ?? fallbackExtension;

  return join(IMAGE_ROOT, year, month, `${randomUUID()}${extension}`);
}

function normalizeExtension(value: string): string | null {
  const extension = value.trim().toLowerCase();

  if ([...mimeExtensions.values()].includes(extension)) {
    return extension;
  }

  return null;
}

function normalizeOriginalName(fileName: string): string {
  const normalized = fileName.trim().replaceAll('\\', '/').split('/').at(-1)?.trim();

  return normalized || 'image';
}

function normalizePublicBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, '');

  return normalized || DEFAULT_PUBLIC_BASE_URL;
}

function ensureInsideUploadDir(uploadDir: string, absolutePath: string): void {
  const normalizedUploadDir = normalize(uploadDir);
  const normalizedPath = normalize(absolutePath);

  if (
    normalizedPath !== normalizedUploadDir &&
    !normalizedPath.startsWith(`${normalizedUploadDir}${sep}`)
  ) {
    throw new UploadsServiceError('INTERNAL_SERVER_ERROR', 'Upload path is invalid');
  }
}
