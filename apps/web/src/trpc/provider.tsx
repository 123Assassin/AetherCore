'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type TrpcClient, trpcClient } from './client';

const TrpcContext = createContext<TrpcClient | null>(null);

export function TrpcProvider({ children }: { children: ReactNode }) {
  return <TrpcContext.Provider value={trpcClient}>{children}</TrpcContext.Provider>;
}

export function useTrpcClient(): TrpcClient {
  const client = useContext(TrpcContext);

  if (!client) {
    throw new Error('useTrpcClient must be used within TrpcProvider');
  }

  return client;
}
