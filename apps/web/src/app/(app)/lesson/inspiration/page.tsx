'use client';

import type { AiStreamEvent } from '@package/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  defaultInspirationFormValues,
  type FeaturedInspirationCase,
  featuredInspirationCases,
  type InspirationFormValues,
} from '../../../../components/inspiration/inspiration.data';
import {
  InspirationChatPanel,
  type InspirationMessage,
} from '../../../../components/inspiration/inspiration-chat-panel';
import { InspirationForm } from '../../../../components/inspiration/inspiration-form';
import { GenerationAdOverlay } from '../../../../components/sponsor/ad-system';
import { useChatHistory } from '../../../../contexts/chat-history-context';
import { useAiGenerationAdGate } from '../../../../hooks/use-ai-generation-ad-gate';
import { useTrpcClient } from '../../../../trpc/provider';

type InspirationHistoryState = {
  formValues: InspirationFormValues;
  kind: 'inspiration';
  messages: InspirationMessage[];
  sessionId?: string;
  suggestions: string[];
};

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '课程灵感生成失败，请稍后重试。';
}

function collectAssistantResponse(events: AiStreamEvent[]) {
  let content = '';
  let suggestions: string[] = [];
  let errorMessage: string | null = null;

  for (const event of events) {
    if (event.type === 'delta') {
      content += event.content;
    }

    if (event.type === 'suggestions') {
      suggestions = event.suggestions;
    }

    if (event.type === 'error') {
      errorMessage = event.message;
    }
  }

  return { content, errorMessage, suggestions };
}

function formatInspirationRequest(values: InspirationFormValues) {
  const context = values.context.trim();

  return [
    `请为我精讲 **${values.topic.trim()}**。`,
    `授课对象：${values.grade} · ${values.subject}`,
    context ? `课堂情境：${context}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInspirationHistoryState(value: unknown): InspirationHistoryState | null {
  if (!isRecord(value) || value.kind !== 'inspiration' || !isRecord(value.formValues)) {
    return null;
  }

  return {
    formValues: {
      ...defaultInspirationFormValues,
      ...value.formValues,
    } as InspirationFormValues,
    kind: 'inspiration',
    messages: Array.isArray(value.messages)
      ? value.messages.filter(
          (item): item is InspirationMessage =>
            isRecord(item) &&
            typeof item.id === 'string' &&
            typeof item.content === 'string' &&
            (item.role === 'user' || item.role === 'assistant')
        )
      : [],
    ...(typeof value.sessionId === 'string' ? { sessionId: value.sessionId } : {}),
    suggestions: Array.isArray(value.suggestions)
      ? value.suggestions.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function createInspirationHistoryMessages(messages: InspirationMessage[]) {
  return messages.map((message) => ({
    content: message.content,
    id: message.id,
    role: message.role,
    timestamp: new Date().toISOString(),
  }));
}

function getMaxMessageIndex(messages: InspirationMessage[]) {
  return messages.reduce((maxIndex, message) => {
    const match = /-(\d+)$/.exec(message.id);
    const nextIndex = match ? Number.parseInt(match[1]!, 10) : 0;

    return Number.isFinite(nextIndex) ? Math.max(maxIndex, nextIndex) : maxIndex;
  }, 0);
}

export default function InspirationPage() {
  const client = useTrpcClient();
  const { currentSessionIds, sessions, setCurrentSessionId, upsertSession } = useChatHistory();
  const { adMode, adOpen, closeAdGate, runWithAdGate } = useAiGenerationAdGate();
  const nextMessageId = useRef(0);
  const appliedSessionIdRef = useRef<string | null | undefined>(undefined);
  const currentHistorySessionId = currentSessionIds.inspiration;
  const activeHistorySession = useMemo(
    () => sessions.find((session) => session.id === currentHistorySessionId),
    [currentHistorySessionId, sessions]
  );
  const [formValues, setFormValues] = useState<InspirationFormValues>(defaultInspirationFormValues);
  const [messages, setMessages] = useState<InspirationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const createMessage = useCallback(
    (role: InspirationMessage['role'], content: string): InspirationMessage => {
      nextMessageId.current += 1;

      return {
        content,
        id: `${role}-${nextMessageId.current}`,
        role,
      };
    },
    []
  );

  const persistInspirationSession = useCallback(
    (state: InspirationHistoryState) => {
      const historySessionId = currentHistorySessionId ?? `inspiration-${Date.now()}`;

      if (!currentHistorySessionId) {
        setCurrentSessionId('inspiration', historySessionId);
        appliedSessionIdRef.current = historySessionId;
      }

      upsertSession({
        category: 'inspiration',
        id: historySessionId,
        messages: createInspirationHistoryMessages(state.messages),
        ...(state.sessionId ? { serverSessionId: state.sessionId } : {}),
        state: state as unknown as Record<string, unknown>,
        title: state.formValues.topic.trim() || '知识精讲',
        updatedAt: Date.now(),
      });
    },
    [currentHistorySessionId, setCurrentSessionId, upsertSession]
  );

  useEffect(() => {
    if (appliedSessionIdRef.current === currentHistorySessionId) {
      return;
    }

    appliedSessionIdRef.current = currentHistorySessionId;

    const state = readInspirationHistoryState(activeHistorySession?.state);

    const timeoutId = setTimeout(() => {
      if (!currentHistorySessionId || !state) {
        nextMessageId.current = 0;
        setFormValues(defaultInspirationFormValues);
        setMessages([]);
        setSessionId(undefined);
        setSuggestions([]);
        setFormError(null);
        setChatError(null);
        return;
      }

      nextMessageId.current = getMaxMessageIndex(state.messages);
      setFormValues(state.formValues);
      setMessages(state.messages);
      setSessionId(state.sessionId);
      setSuggestions(state.suggestions);
      setFormError(null);
      setChatError(null);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeHistorySession?.state, currentHistorySessionId]);

  const handleFormChange = useCallback(
    (nextValues: InspirationFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.topic.trim()) {
        setFormError(null);
      }

      if (currentHistorySessionId) {
        persistInspirationSession({
          formValues: nextValues,
          kind: 'inspiration',
          messages,
          ...(sessionId ? { sessionId } : {}),
          suggestions,
        });
      }
    },
    [
      currentHistorySessionId,
      formError,
      messages,
      persistInspirationSession,
      sessionId,
      suggestions,
    ]
  );

  const generateInspiration = useCallback(
    (values: InspirationFormValues) => {
      const trimmedTopic = values.topic.trim();
      const trimmedContext = values.context.trim();

      if (!trimmedTopic) {
        setFormError('请先填写主题。');
        return;
      }

      if (loading) {
        return;
      }

      runWithAdGate(async () => {
        const userMessage = createMessage(
          'user',
          formatInspirationRequest({ ...values, topic: trimmedTopic })
        );
        const baseMessages = [...messages, userMessage];

        setLoading(true);
        setFormError(null);
        setChatError(null);
        setSuggestions([]);
        setMessages(baseMessages);

        try {
          const result = await client.ai.inspiration.generate.mutate({
            grade: values.grade,
            ...(sessionId ? { sessionId } : {}),
            ...(trimmedContext ? { context: trimmedContext } : {}),
            subject: values.subject,
            topic: trimmedTopic,
          });
          const assistantResponse = collectAssistantResponse(result.events);

          setSessionId(result.sessionId);
          setSuggestions(assistantResponse.suggestions);

          if (assistantResponse.errorMessage) {
            setChatError(assistantResponse.errorMessage);
            persistInspirationSession({
              formValues: values,
              kind: 'inspiration',
              messages: baseMessages,
              sessionId: result.sessionId,
              suggestions: assistantResponse.suggestions,
            });
            return;
          }

          const nextMessages = assistantResponse.content.trim()
            ? [...baseMessages, createMessage('assistant', assistantResponse.content)]
            : baseMessages;

          setMessages(nextMessages);
          persistInspirationSession({
            formValues: values,
            kind: 'inspiration',
            messages: nextMessages,
            sessionId: result.sessionId,
            suggestions: assistantResponse.suggestions,
          });
        } catch (mutationError) {
          setChatError(getMutationErrorMessage(mutationError));
        } finally {
          setLoading(false);
        }
      });
    },
    [client, createMessage, loading, messages, persistInspirationSession, runWithAdGate, sessionId]
  );

  const handleFeaturedCaseSelect = useCallback(
    (item: FeaturedInspirationCase) => {
      const nextValues: InspirationFormValues = {
        context: item.context,
        grade: item.grade,
        subject: item.subject,
        topic: item.topic,
      };

      setFormValues(nextValues);
      void generateInspiration(nextValues);
    },
    [generateInspiration]
  );

  const handleFollowUp = useCallback(
    (rawMessage: string) => {
      const trimmedMessage = rawMessage.trim();

      if (!sessionId || !trimmedMessage || loading) {
        return;
      }

      runWithAdGate(async () => {
        const userMessage = createMessage('user', trimmedMessage);
        const baseMessages = [...messages, userMessage];

        setLoading(true);
        setChatError(null);
        setSuggestions([]);
        setMessages(baseMessages);

        try {
          const result = await client.ai.inspiration.followUp.mutate({
            message: trimmedMessage,
            sessionId,
          });
          const assistantResponse = collectAssistantResponse(result.events);

          setSessionId(result.sessionId);
          setSuggestions(assistantResponse.suggestions);

          if (assistantResponse.errorMessage) {
            setChatError(assistantResponse.errorMessage);
            persistInspirationSession({
              formValues,
              kind: 'inspiration',
              messages: baseMessages,
              sessionId: result.sessionId,
              suggestions: assistantResponse.suggestions,
            });
            return;
          }

          const nextMessages = assistantResponse.content.trim()
            ? [...baseMessages, createMessage('assistant', assistantResponse.content)]
            : baseMessages;

          setMessages(nextMessages);
          persistInspirationSession({
            formValues,
            kind: 'inspiration',
            messages: nextMessages,
            sessionId: result.sessionId,
            suggestions: assistantResponse.suggestions,
          });
        } catch (mutationError) {
          setChatError(getMutationErrorMessage(mutationError));
        } finally {
          setLoading(false);
        }
      });
    },
    [
      client,
      createMessage,
      formValues,
      loading,
      messages,
      persistInspirationSession,
      runWithAdGate,
      sessionId,
    ]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <section
          aria-label="知识精讲输入"
          className="custom-scrollbar h-full w-full shrink-0 overflow-y-auto pr-0 lg:w-[420px] lg:pr-2"
        >
          <InspirationForm
            disabled={loading}
            error={formError}
            onChange={handleFormChange}
            onSubmit={generateInspiration}
            values={formValues}
          />
        </section>

        <InspirationChatPanel
          disabled={loading}
          error={chatError}
          featuredCases={featuredInspirationCases}
          messages={messages}
          onFeaturedCaseSelect={handleFeaturedCaseSelect}
          onFollowUp={handleFollowUp}
          sessionId={sessionId}
          suggestions={suggestions}
        />
      </div>
      <GenerationAdOverlay isOpen={adOpen} mode={adMode} onClose={closeAdGate} />
    </div>
  );
}
