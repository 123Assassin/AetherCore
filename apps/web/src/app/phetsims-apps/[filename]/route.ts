import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const simulationAppDirectoryName = 'phetsims_apps';

type RouteContext = {
  params: Promise<{
    filename: string;
  }>;
};

function getSafeFilename(filename: string) {
  const basename = path.basename(filename);

  if (!basename || basename !== filename || basename.includes('..')) {
    return null;
  }

  return basename;
}

function resolveSimulationAppBasePath() {
  const defaultBasePath = path.resolve(process.cwd(), simulationAppDirectoryName);
  const candidates = [
    defaultBasePath,
    path.resolve(process.cwd(), '..', '..', simulationAppDirectoryName),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? defaultBasePath;
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const safeFilename = getSafeFilename(filename);

  if (!safeFilename) {
    return new Response('Invalid simulation app filename.', { status: 400 });
  }

  try {
    const file = await readFile(path.join(resolveSimulationAppBasePath(), safeFilename));

    return new Response(file, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch {
    return new Response('Simulation app not found.', { status: 404 });
  }
}
