const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;
const adaptedSimulationAppRouteBase = '/phetsims-apps';
const adaptedSimulationAppSuffix = '.html';
const simulationThumbnailRouteBase = '/simulation-thumbnails';
const defaultSimulationAppPort = '80';

type SimulationAppHostOptions = {
  hostname?: string;
  port?: string;
};

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

export function resolveSimulationAppBaseUrl(options: SimulationAppHostOptions = {}): string {
  const hostname = options.hostname?.trim() || readCurrentHostname() || 'localhost';
  const port =
    options.port?.trim() || process.env.NEXT_PUBLIC_SIMULATION_APP_PORT || defaultSimulationAppPort;

  return `http://${hostname}:${port}`;
}

export function resolveSimulationAppUrl(src: string | null | undefined): string | null {
  const trimmedSrc = src?.trim();

  if (!trimmedSrc) {
    return null;
  }

  if (
    absoluteUrlPattern.test(trimmedSrc) ||
    trimmedSrc.startsWith('//') ||
    trimmedSrc.startsWith('/')
  ) {
    return trimmedSrc;
  }

  const sourceId = resolveSimulationSourceId(trimmedSrc);
  const source = `${sourceId}${adaptedSimulationAppSuffix}`;

  return resolveSimulationAssetUrl(source, adaptedSimulationAppRouteBase);
}

function resolveSimulationSourceId(src: string) {
  if (src.endsWith('_en.html')) {
    return src.slice(0, -'_en.html'.length);
  }

  return src.endsWith('.html') ? src.slice(0, -'.html'.length) : src;
}

function readCurrentHostname(): string | null {
  const value = (globalThis as { location?: { hostname?: unknown } }).location?.hostname;

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
