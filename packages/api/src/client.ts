import { createTRPCClient, httpBatchLink, type TRPCClient } from '@trpc/client';
import type { AnyTRPCRouter, inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type ApiClient<TRouter extends AnyTRPCRouter> = TRPCClient<TRouter>;

export type ApiRouterInputs<TRouter extends AnyTRPCRouter> = inferRouterInputs<TRouter>;

export type ApiRouterOutputs<TRouter extends AnyTRPCRouter> = inferRouterOutputs<TRouter>;

type HttpBatchLinkOptions<TRouter extends AnyTRPCRouter> = Parameters<
  typeof httpBatchLink<TRouter>
>[0];

export type CreateApiClientOptions<TRouter extends AnyTRPCRouter> = Omit<
  HttpBatchLinkOptions<TRouter>,
  'url'
>;

export const createApiClient = <TRouter extends AnyTRPCRouter>(
  baseUrl: string,
  options?: CreateApiClientOptions<TRouter>
): ApiClient<TRouter> => {
  const linkOptions = {
    ...(options ?? {}),
    url: `${baseUrl}/trpc`,
  } as HttpBatchLinkOptions<TRouter>;

  return createTRPCClient<TRouter>({
    links: [httpBatchLink<TRouter>(linkOptions)],
  });
};
