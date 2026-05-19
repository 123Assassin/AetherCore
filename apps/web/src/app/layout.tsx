import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { TrpcProvider } from '../trpc/provider';

export const metadata: Metadata = {
  title: 'AetherCore Web',
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
