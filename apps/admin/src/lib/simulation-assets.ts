const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;
const simulationThumbnailRouteBase = '/simulation-thumbnails';

export function resolveSimulationAssetUrl(
  source: string | null | undefined,
  baseUrl: string | null | undefined
): string | null {
  const trimmedSource = source?.trim();

  if (!trimmedSource) {
    return null;
  }

  if (
    absoluteUrlPattern.test(trimmedSource) ||
    trimmedSource.startsWith('//') ||
    trimmedSource.startsWith('/')
  ) {
    return trimmedSource;
  }

  const trimmedBaseUrl = baseUrl?.trim();

  if (!trimmedBaseUrl) {
    return trimmedSource;
  }

  return `${trimmedBaseUrl.replace(/\/+$/, '')}/${trimmedSource.replace(/^\/+/, '')}`;
}

export function resolveSimulationThumbnailUrl(thumbnail: string | null): string | null {
  return resolveSimulationAssetUrl(thumbnail, simulationThumbnailRouteBase);
}
