'use client';

import type { AuthUserSummary } from '@package/shared';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

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

export function AdminShell({ children }: { children: ReactNode }) {
  const client = useTrpcClient();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking', user: null });

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
      <main
        aria-busy="true"
        className="bg-bg-light flex min-h-screen items-center justify-center p-6 text-slate-700"
      >
        <p className="text-sm">
          {authState.status === 'redirecting' ? '正在跳转登录...' : '正在检查管理员会话...'}
        </p>
      </main>
    );
  }

  return (
    <div className="bg-bg-light flex min-h-screen">
      <AdminSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <div className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-8">{children}</div>
      </main>
    </div>
  );
}
