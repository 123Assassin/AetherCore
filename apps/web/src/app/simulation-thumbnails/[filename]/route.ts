import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const contentTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const thumbnailDirectoryName = 'phetsims_thumbnail';

type RouteContext = {
  params: Promise<{
    filename: string;
  }>;
};

function getContentType(filename: string) {
  return contentTypes[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

function getSafeFilename(filename: string) {
  const basename = path.basename(filename);

  if (!basename || basename !== filename || basename.includes('..')) {
    return null;
  }

  return basename;
}

function resolveThumbnailBasePath() {
  const defaultBasePath = path.resolve(process.cwd(), thumbnailDirectoryName);
  const candidates = [
    defaultBasePath,
    path.resolve(process.cwd(), '..', '..', thumbnailDirectoryName),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? defaultBasePath;
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return new Response('Invalid simulation thumbnail filename.', { status: 400 });
  }

  try {
    const file = await readFile(path.join(resolveThumbnailBasePath(), safeFilename));

    return new Response(file, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': getContentType(safeFilename),
      },
    });
  } catch {
    return new Response('Simulation thumbnail not found.', { status: 404 });
  }
}
