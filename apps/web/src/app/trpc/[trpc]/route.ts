import { getInternalApiUrl, proxyServerRequest } from '../../../lib/server-api-proxy';

type RouteContext = {
  params: Promise<{
    trpc: string;
  }>;
};

async function proxyTrpcRequest(request: Request, context: RouteContext) {
  const { trpc } = await context.params;
  const upstreamUrl = new URL(`/trpc/${encodeURIComponent(trpc)}`, getInternalApiUrl());

  upstreamUrl.search = new URL(request.url).search;

  return proxyServerRequest(request, upstreamUrl.toString());
}

export function GET(request: Request, context: RouteContext) {
  return proxyTrpcRequest(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return proxyTrpcRequest(request, context);
}
