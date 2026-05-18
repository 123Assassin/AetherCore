import { createTRPCClient, httpBatchLink } from '@trpc/client';

export const createApiClient = (baseUrl: string) =>
  createTRPCClient({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
      }),
    ],
  });
