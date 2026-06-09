'use client';

import type { AuthUserSummary } from '@package/shared';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { ChatHistoryProvider, useChatHistory } from '../../contexts/chat-history-context';
import { UserPreferencesProvider } from '../../contexts/user-preferences-context';
import { WebAuthProvider } from '../../contexts/web-auth-context';
import { getLoggedOutRedirectPath, getLoginRequiredMessage } from '../../lib/auth-gate';
import { useTrpcClient } from '../../trpc/provider';
import { UserLoginModal } from '../auth/user-login-modal';
import { DonateModal } from '../sponsor/donate-modal';
import { AppHeader, useShellRoute } from './app-header';
import { AppSidebar } from './app-sidebar';
import { HistorySidebar } from './history-sidebar';

type AppShellProps = {
  children: ReactNode;
};

function AppShellContent({ children }: AppShellProps) {
  const client = useTrpcClient();
  const pathname = usePathname();
  const router = useRouter();
  const route = useShellRoute();
  const { createNewSession, currentSessionIds, setCurrentSessionId } = useChatHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const historyEnabled = route.activeCategory !== 'chat';

  const requestLogin = useCallback((message?: string | null) => {
    setLoginMessage(message ?? null);
    setLoginOpen(true);
  }, []);

  useEffect(() => {
    if (!historyEnabled) {
      return;
    }

    const location = (globalThis as { location?: { search?: string } }).location;

    if (new URLSearchParams(location?.search ?? '').get('history') === 'open') {
      const timeoutId = setTimeout(() => setHistoryOpen(true), 0);

      return () => clearTimeout(timeoutId);
    }
  }, [historyEnabled]);

  useEffect(() => {
    if (!historyEnabled) {
      const timeoutId = setTimeout(() => setHistoryOpen(false), 0);

      return () => clearTimeout(timeoutId);
    }
  }, [historyEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserProfile() {
      try {
        const profile = await client.me.profile.query();

        if (!cancelled) {
          setUser({ ...profile, username: null });
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    void loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (!authChecked || user) {
      return;
    }

    const location = (globalThis as { location?: { search?: string } }).location;

    if (new URLSearchParams(location?.search ?? '').get('login') === 'required') {
      const timeoutId = setTimeout(() => requestLogin(getLoginRequiredMessage()), 0);

      router.replace('/');
      return () => clearTimeout(timeoutId);
    }

    const redirectPath = getLoggedOutRedirectPath(pathname);

    if (redirectPath) {
      const timeoutId = setTimeout(() => requestLogin(getLoginRequiredMessage()), 0);

      router.replace(redirectPath);
      return () => clearTimeout(timeoutId);
    }
  }, [authChecked, pathname, requestLogin, router, user]);

  async function handleLogout() {
    setUser(null);

    try {
      await client.auth.logout.mutate();
    } catch {
      // The local shell should still return to the logged-out state if the mock API is offline.
    }
  }

  return (
    <WebAuthProvider authChecked={authChecked} requestLogin={requestLogin} user={user}>
      <div className="aether-web-shell flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
        <AppSidebar
          activeTab={route.activeTab}
          onDonateClick={() => setDonateOpen(true)}
          onLoginClick={() => requestLogin(null)}
          onLogoutClick={handleLogout}
          user={user}
        />
        {historyEnabled ? (
          <HistorySidebar
            activeCategory={route.activeCategory}
            activeTab={route.activeTab}
            currentSessionId={currentSessionIds[route.activeCategory] ?? null}
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            onSelectSession={(session) => {
              if (session) {
                setCurrentSessionId(session.category, session.id);
              } else if (route.activeCategory === 'chat') {
                setCurrentSessionId(route.activeCategory, null);
              } else {
                createNewSession(route.activeCategory);
              }
            }}
          />
        ) : null}
        <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col bg-white/50">
          <AppHeader
            activeTab={route.activeTab}
            historyOpen={historyOpen}
            onToggleHistory={() => {
              if (historyEnabled) {
                setHistoryOpen((open) => !open);
              }
            }}
            showHistoryToggle={historyEnabled}
          />
          <main className="relative flex-1 overflow-auto bg-slate-50/50 p-6">{children}</main>
        </div>
        {loginOpen ? (
          <UserLoginModal
            message={loginMessage}
            onClose={() => {
              setLoginOpen(false);
              setLoginMessage(null);
            }}
            onLoginSuccess={(nextUser) => setUser(nextUser)}
            open
          />
        ) : null}
        <DonateModal onClose={() => setDonateOpen(false)} open={donateOpen} />
        <style>{`
        .aether-web-shell .lesson-sub-nav,
        .aether-web-shell .office-sub-nav {
          display: none;
        }
      `}</style>
      </div>
    </WebAuthProvider>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <UserPreferencesProvider>
      <ChatHistoryProvider>
        <AppShellContent>{children}</AppShellContent>
      </ChatHistoryProvider>
    </UserPreferencesProvider>
  );
}
