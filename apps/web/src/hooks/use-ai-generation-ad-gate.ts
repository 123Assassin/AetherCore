'use client';

import { useCallback, useRef, useState } from 'react';

import { useUserPreferences } from '../contexts/user-preferences-context';

export type AiGenerationAdMode = 'generating' | 'waiting';

type GenerationAction = () => Promise<void> | void;

export function useAiGenerationAdGate() {
  const { consumeCredit } = useUserPreferences();
  const pendingActionRef = useRef<GenerationAction | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [adMode, setAdMode] = useState<AiGenerationAdMode>('generating');

  const runWithAdGate = useCallback(
    (action: GenerationAction) => {
      const hasCredit = consumeCredit();

      setAdMode(hasCredit ? 'generating' : 'waiting');
      setAdOpen(true);

      if (hasCredit) {
        void action();
        return;
      }

      pendingActionRef.current = action;
    },
    [consumeCredit]
  );

  const closeAdGate = useCallback(() => {
    const pendingAction = pendingActionRef.current;

    pendingActionRef.current = null;
    setAdOpen(false);

    if (pendingAction) {
      void pendingAction();
    }
  }, []);

  return {
    adMode,
    adOpen,
    closeAdGate,
    runWithAdGate,
  };
}
