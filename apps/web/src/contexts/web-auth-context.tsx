'use client';

import type { AuthUserSummary } from '@package/shared';
import { createContext, type ReactNode, useContext } from 'react';

type WebAuthContextType = {
  authChecked: boolean;
  requestLogin: (message?: string | null) => void;
  user: AuthUserSummary | null;
};

const WebAuthContext = createContext<WebAuthContextType | undefined>(undefined);

export function WebAuthProvider({
  authChecked,
  children,
  requestLogin,
  user,
}: WebAuthContextType & { children: ReactNode }) {
  return (
    <WebAuthContext.Provider value={{ authChecked, requestLogin, user }}>
      {children}
    </WebAuthContext.Provider>
  );
}

export function useWebAuth() {
  const context = useContext(WebAuthContext);

  if (!context) {
    throw new Error('useWebAuth must be used within WebAuthProvider');
  }

  return context;
}
