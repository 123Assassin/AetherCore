import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export function createTRPCContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
