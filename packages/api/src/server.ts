import type { AnyTRPCRouter } from '@trpc/server';

export type ApiServerCallerFactory<TRouter extends AnyTRPCRouter> = TRouter['createCaller'];

export type ApiServerCaller<TRouter extends AnyTRPCRouter> = ReturnType<
  ApiServerCallerFactory<TRouter>
>;

export type ApiServerCallerArgs<TRouter extends AnyTRPCRouter> = Parameters<
  ApiServerCallerFactory<TRouter>
>;

type AnyServerCallerFactory = AnyTRPCRouter['createCaller'];

export const createServerCaller = <
  TArgs extends Parameters<AnyServerCallerFactory>,
  TReturn extends ReturnType<AnyServerCallerFactory>,
>(
  createCaller: (...args: TArgs) => TReturn,
  ...args: TArgs
): TReturn => createCaller(...args);
