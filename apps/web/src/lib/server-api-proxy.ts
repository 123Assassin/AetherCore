const defaultInternalApiUrl = 'http://localhost:7001';

export function getInternalApiUrl() {
  return (process.env.INTERNAL_API_URL?.trim() || defaultInternalApiUrl).replace(/\/+$/, '');
}

export async function proxyServerRequest(request: Request, upstreamUrl: string) {
  const headers = new Headers(request.headers);

  headers.delete('host');

  const upstreamResponse = await fetch(upstreamUrl, {
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    duplex: request.body ? 'half' : undefined,
    headers,
    method: request.method,
    redirect: 'manual',
  } as RequestInit & { duplex?: 'half' });
  const responseHeaders = new Headers(upstreamResponse.headers);

  return new Response(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}
