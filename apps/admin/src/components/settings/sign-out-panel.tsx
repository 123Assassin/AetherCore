'use client';

import { useRouter } from 'next/navigation';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

export function SignOutPanel() {
  const client = useTrpcClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleSignOut() {
    let redirected = false;

    setLoading(true);
    setError(null);

    try {
      await client.adminAuth.logout.mutate();
      redirected = true;
      router.replace('/login');
    } catch {
      if (mountedRef.current) {
        setError('退出登录失败，请稍后重试。');
      }
    } finally {
      if (!redirected && mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <section aria-labelledby="sign-out-panel-title" style={styles.panel}>
      <div style={styles.header}>
        <p style={styles.eyebrow}>Session</p>
        <h2 id="sign-out-panel-title" style={styles.title}>
          管理员会话
        </h2>
      </div>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      <button disabled={loading} onClick={handleSignOut} style={styles.dangerButton} type="button">
        {loading ? '退出中...' : 'Sign Out'}
      </button>
    </section>
  );
}

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: '20px',
  padding: '9px 14px',
} satisfies CSSProperties;

const styles = {
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    justifySelf: 'start',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: 0,
  },
  header: {
    display: 'grid',
    gap: 2,
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    padding: 18,
  },
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
