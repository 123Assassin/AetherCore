'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useTrpcClient } from '../trpc/provider';

export default function Page() {
  const client = useTrpcClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    client.adminAuth.session
      .query()
      .then((session) => {
        if (cancelled) {
          return;
        }

        router.replace(session.authenticated ? '/dashboard' : '/login');
      })
      .catch(() => {
        if (!cancelled) {
          router.replace('/login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, router]);

  return (
    <main style={styles.main}>
      <p style={styles.loading}>正在检查管理员会话...</p>
    </main>
  );
}

const styles = {
  main: {
    alignItems: 'center',
    color: '#334155',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  loading: {
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
  },
} as const;
