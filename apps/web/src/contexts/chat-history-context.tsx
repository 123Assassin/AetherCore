'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type ChatSessionCategory = 'chat' | 'comment' | 'inspiration' | 'simulation' | 'teaching';

export type Message = {
  action?: {
    href: string;
    label: string;
  };
  content: string;
  id: string;
  role: 'user' | 'assistant';
  suggestions?: string[];
  timestamp: Date | string;
};

export type ChatSession = {
  category: ChatSessionCategory;
  id: string;
  messages: Message[];
  serverSessionId?: string;
  state?: Record<string, unknown> | null;
  title: string;
  updatedAt: number;
};

type ChatHistoryContextType = {
  clearHistory: () => void;
  createNewSession: (category: ChatSessionCategory) => string;
  currentSessionIds: Record<ChatSessionCategory, string | null>;
  deleteSession: (id: string) => void;
  sessions: ChatSession[];
  setCurrentSessionId: (category: ChatSessionCategory, id: string | null) => void;
  updateSession: (id: string, messages: Message[]) => void;
  upsertSession: (session: ChatSession) => void;
};

const emptyCurrentSessions: Record<ChatSessionCategory, string | null> = {
  chat: null,
  comment: null,
  inspiration: null,
  simulation: null,
  teaching: null,
};

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

type BrowserStorageEnvironment = {
  localStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
};

function getBrowserStorage() {
  return (globalThis as unknown as BrowserStorageEnvironment).localStorage;
}

function readStoredSessions(): ChatSession[] {
  const storage = getBrowserStorage();

  if (!storage) {
    return [];
  }

  const saved = storage.getItem('chatHistory');

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse chat history', error);
    return [];
  }
}

function writeStoredSessions(sessions: ChatSession[]) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  storage.setItem('chatHistory', JSON.stringify(sessions));
}

function getSessionTitle(currentTitle: string, messages: Message[]) {
  if (currentTitle && currentTitle !== '新对话') {
    return currentTitle;
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');

  if (!firstUserMessage) {
    return currentTitle || '新对话';
  }

  return (
    firstUserMessage.content.slice(0, 15) + (firstUserMessage.content.length > 15 ? '...' : '')
  );
}

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => readStoredSessions());
  const [currentSessionIds, setCurrentSessionIds] =
    useState<Record<ChatSessionCategory, string | null>>(emptyCurrentSessions);

  useEffect(() => {
    writeStoredSessions(sessions);
  }, [sessions]);

  const setCurrentSessionId = useCallback((category: ChatSessionCategory, id: string | null) => {
    setCurrentSessionIds((current) => ({ ...current, [category]: id }));
  }, []);

  const createNewSession = useCallback(
    (category: ChatSessionCategory) => {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        category,
        id: newId,
        messages: [],
        title: '新对话',
        updatedAt: Date.now(),
      };

      setSessions((current) => [newSession, ...current]);
      setCurrentSessionId(category, newId);

      return newId;
    },
    [setCurrentSessionId]
  );

  const updateSession = useCallback((id: string, messages: Message[]) => {
    setSessions((current) => {
      const existing = current.find((session) => session.id === id);

      if (!existing) {
        return current;
      }

      if (JSON.stringify(existing.messages) === JSON.stringify(messages)) {
        return current;
      }

      const title = getSessionTitle(existing.title, messages);

      return current
        .map((session) =>
          session.id === id ? { ...session, messages, title, updatedAt: Date.now() } : session
        )
        .sort((first, second) => second.updatedAt - first.updatedAt);
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((current) => current.filter((session) => session.id !== id));
    setCurrentSessionIds((current) => {
      const next = { ...current };

      for (const category of Object.keys(next) as ChatSessionCategory[]) {
        if (next[category] === id) {
          next[category] = null;
        }
      }

      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
    setCurrentSessionIds(emptyCurrentSessions);
  }, []);

  const upsertSession = useCallback((session: ChatSession) => {
    setSessions((current) => {
      const nextSession = {
        ...session,
        title: getSessionTitle(session.title, session.messages),
      };
      const exists = current.some((currentSession) => currentSession.id === session.id);
      const next = exists
        ? current.map((currentSession) =>
            currentSession.id === session.id ? nextSession : currentSession
          )
        : [nextSession, ...current];

      return next.sort((first, second) => second.updatedAt - first.updatedAt);
    });
  }, []);

  return (
    <ChatHistoryContext.Provider
      value={{
        clearHistory,
        createNewSession,
        currentSessionIds,
        deleteSession,
        sessions,
        setCurrentSessionId,
        updateSession,
        upsertSession,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);

  if (context === undefined) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }

  return context;
}
