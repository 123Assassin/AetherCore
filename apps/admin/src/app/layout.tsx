import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { TrpcProvider } from '../trpc/provider';

export const metadata: Metadata = {
  title: 'AetherCore Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
