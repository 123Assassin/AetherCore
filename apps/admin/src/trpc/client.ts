import { type ApiClient, createApiClient } from '@package/api';

import type { AppRouter } from '../../../server/src/trpc/router.js';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

export type TrpcClient = ApiClient<AppRouter>;

export const trpcClient: TrpcClient = createApiClient<AppRouter>(apiUrl);
