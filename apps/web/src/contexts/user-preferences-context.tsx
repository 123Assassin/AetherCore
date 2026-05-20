'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

type UserPreferences = {
  addCredit: (amount: number) => void;
  consumeCredit: () => boolean;
  credits: number;
  grade: string;
  setGrade: (grade: string) => void;
  setSubject: (subject: string) => void;
  subject: string;
};

const UserPreferencesContext = createContext<UserPreferences | undefined>(undefined);

type BrowserStorageEnvironment = {
  localStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
};

function getBrowserStorage() {
  return (globalThis as unknown as BrowserStorageEnvironment).localStorage;
}

function readStoredValue(key: string, fallback: string) {
  const storage = getBrowserStorage();

  if (!storage) {
    return fallback;
  }

  return storage.getItem(key) || fallback;
}

function readStoredInteger(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function readStoredCredits() {
  const storage = getBrowserStorage();

  if (!storage) {
    return 40;
  }

  const saved = storage.getItem('user_credits');
  const lastReset = storage.getItem('user_credits_reset');
  const now = Date.now();
  const hundredEightyDays = 180 * 24 * 60 * 60 * 1000;
  const parsedLastReset = readStoredInteger(lastReset);

  if (parsedLastReset === null) {
    storage.setItem('user_credits_reset', now.toString());
    storage.setItem('user_credits', '40');
    return 40;
  }

  if (now - parsedLastReset > hundredEightyDays) {
    storage.setItem('user_credits_reset', now.toString());
    storage.setItem('user_credits', '40');
    return 40;
  }

  const parsedCredits = readStoredInteger(saved);

  if (parsedCredits === null) {
    storage.setItem('user_credits', '40');
    return 40;
  }

  return parsedCredits;
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [grade, setGrade] = useState(() => readStoredValue('user_pref_grade', '初中'));
  const [subject, setSubject] = useState(() => readStoredValue('user_pref_subject', '语文'));
  const [credits, setCredits] = useState(() => readStoredCredits());

  useEffect(() => {
    const storage = getBrowserStorage();

    if (storage) {
      storage.setItem('user_pref_grade', grade);
    }
  }, [grade]);

  useEffect(() => {
    const storage = getBrowserStorage();

    if (storage) {
      storage.setItem('user_pref_subject', subject);
    }
  }, [subject]);

  useEffect(() => {
    const storage = getBrowserStorage();

    if (storage) {
      storage.setItem('user_credits', credits.toString());
    }
  }, [credits]);

  function consumeCredit() {
    if (credits > 0) {
      setCredits((current) => current - 1);
      return true;
    }

    return false;
  }

  function addCredit(amount: number) {
    setCredits((current) => current + amount);
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        addCredit,
        consumeCredit,
        credits,
        grade,
        setGrade,
        setSubject,
        subject,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);

  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }

  return context;
}
