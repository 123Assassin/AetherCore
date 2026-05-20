'use client';

import type { AuthUserSummary } from '@package/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ChatHistoryProvider, useChatHistory } from '../../contexts/chat-history-context';
import { UserPreferencesProvider } from '../../contexts/user-preferences-context';
import { useTrpcClient } from '../../trpc/provider';
import { WeChatLoginModal } from '../auth/wechat-login-modal';
import { DonateModal } from '../sponsor/donate-modal';
import { AppHeader, useShellRoute } from './app-header';
import { AppSidebar } from './app-sidebar';
import { HistorySidebar } from './history-sidebar';

type AppShellProps = {
  children: ReactNode;
};

function AppShellContent({ children }: AppShellProps) {
  const client = useTrpcClient();
  const route = useShellRoute();
  const { currentSessionIds, setCurrentSessionId } = useChatHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [user, setUser] = useState<AuthUserSummary | null>(null);

  async function handleLogout() {
    setUser(null);

    try {
      await client.auth.logout.mutate();
    } catch {
      // The local shell should still return to the logged-out state if the mock API is offline.
    }
  }

  return (
    <div className="aether-web-shell flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <AppSidebar
        activeTab={route.activeTab}
        onDonateClick={() => setDonateOpen(true)}
        onLoginClick={() => setLoginOpen(true)}
        onLogoutClick={handleLogout}
        user={user}
      />
      <HistorySidebar
        activeCategory={route.activeCategory}
        activeTab={route.activeTab}
        currentSessionId={currentSessionIds[route.activeCategory] ?? null}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSession={(session) => {
          if (session) {
            setCurrentSessionId(session.category, session.id);
          } else {
            setCurrentSessionId(route.activeCategory, null);
          }
        }}
      />
      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col bg-white/50">
        <AppHeader
          activeTab={route.activeTab}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((open) => !open)}
        />
        <main className="relative flex-1 overflow-auto bg-slate-50/50 p-6">{children}</main>
      </div>
      {loginOpen ? (
        <WeChatLoginModal
          onClose={() => setLoginOpen(false)}
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
