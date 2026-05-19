'use client';

import type { AuthUserSummary } from '@package/shared';
import { usePathname, useRouter } from 'next/navigation';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

type AuthState =
  | {
      status: 'checking';
      user: null;
    }
  | {
      status: 'authenticated';
      user: AuthUserSummary;
    }
  | {
      status: 'redirecting';
      user: null;
    };

type ShellMediaQueryList = {
  addEventListener: (type: 'change', listener: () => void) => void;
  matches: boolean;
  removeEventListener: (type: 'change', listener: () => void) => void;
};

type ShellBrowserGlobal = typeof globalThis & {
  matchMedia?: (query: string) => ShellMediaQueryList;
};

export function AdminShell({ children }: { children: ReactNode }) {
  const client = useTrpcClient();
  const pathname = usePathname();
  const router = useRouter();
  const compact = useCompactShell();
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking', user: null });
  const showHeader = pathname !== '/simulations';

  useEffect(() => {
    let cancelled = false;

    client.adminAuth.session
      .query()
      .then((session) => {
        if (cancelled) {
          return;
        }

        if (!session.authenticated || !('user' in session)) {
          setAuthState({ status: 'redirecting', user: null });
          router.replace('/login');
          return;
        }

        setAuthState({ status: 'authenticated', user: session.user });
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState({ status: 'redirecting', user: null });
          router.replace('/login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, router]);

  if (authState.status !== 'authenticated') {
    return (
      <main aria-busy="true" style={styles.loadingScreen}>
        <p style={styles.loadingText}>
          {authState.status === 'redirecting' ? '正在跳转登录...' : '正在检查管理员会话...'}
        </p>
      </main>
    );
  }

  return (
    <div style={compact ? styles.compactShell : styles.shell}>
      <AdminSidebar compact={compact} />
      <div style={styles.workspace}>
        {showHeader ? <AdminHeader compact={compact} user={authState.user} /> : null}
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function useCompactShell(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const browserGlobal = globalThis as ShellBrowserGlobal;

    if (!browserGlobal.matchMedia) {
      return;
    }

    const mediaQuery = browserGlobal.matchMedia('(max-width: 767px)');
    const updateCompact = () => setCompact(mediaQuery.matches);

    updateCompact();
    mediaQuery.addEventListener('change', updateCompact);

    return () => {
      mediaQuery.removeEventListener('change', updateCompact);
    };
  }, []);

  return compact;
}

const styles = {
  compactShell: {
    background: '#f8fafc',
    color: '#172033',
    display: 'grid',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    minHeight: '100vh',
    minWidth: 0,
  },
  content: {
    minWidth: 0,
  },
  loadingScreen: {
    alignItems: 'center',
    background: '#f8fafc',
    color: '#334155',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
  },
  shell: {
    background: '#f8fafc',
    color: '#172033',
    display: 'grid',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    gridTemplateColumns: 'minmax(220px, 248px) minmax(0, 1fr)',
    minHeight: '100vh',
  },
  workspace: {
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    minWidth: 0,
  },
} satisfies Record<string, CSSProperties>;
