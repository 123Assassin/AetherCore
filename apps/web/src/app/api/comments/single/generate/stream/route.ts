import { getInternalApiUrl, proxyServerRequest } from '../../../../../../lib/server-api-proxy';

export function POST(request: Request) {
  return proxyServerRequest(request, `${getInternalApiUrl()}/api/comments/single/generate/stream`);
}
