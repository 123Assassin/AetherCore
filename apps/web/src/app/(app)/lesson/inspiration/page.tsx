'use client';

import type { AiStreamEvent } from '@package/shared';
import { useCallback, useRef, useState } from 'react';

import {
  type FeaturedInspirationCase,
  featuredInspirationCases,
  type InspirationFormValues,
} from '../../../../components/inspiration/inspiration.data';
import {
  InspirationChatPanel,
  type InspirationMessage,
} from '../../../../components/inspiration/inspiration-chat-panel';
import { InspirationForm } from '../../../../components/inspiration/inspiration-form';
import { useTrpcClient } from '../../../../trpc/provider';

const initialFormValues: InspirationFormValues = {
  context: '',
  grade: '高中',
  subject: '数学',
  topic: '',
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

export default function InspirationPage() {
  const client = useTrpcClient();
  const nextMessageId = useRef(0);
  const [formValues, setFormValues] = useState<InspirationFormValues>(initialFormValues);
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

  const handleFormChange = useCallback(
    (nextValues: InspirationFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.topic.trim()) {
        setFormError(null);
      }
    },
    [formError]
  );

  const generateInspiration = useCallback(
    async (values: InspirationFormValues) => {
      const trimmedTopic = values.topic.trim();
      const trimmedContext = values.context.trim();

      if (!trimmedTopic) {
        setFormError('请先填写主题。');
        return;
      }

      if (loading) {
        return;
      }

      setLoading(true);
      setFormError(null);
      setChatError(null);
      setSuggestions([]);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', formatInspirationRequest({ ...values, topic: trimmedTopic })),
      ]);

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
          return;
        }

        if (assistantResponse.content.trim()) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', assistantResponse.content),
          ]);
        }
      } catch (mutationError) {
        setChatError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [client, createMessage, loading, sessionId]
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
    async (rawMessage: string) => {
      const trimmedMessage = rawMessage.trim();

      if (!sessionId || !trimmedMessage || loading) {
        return;
      }

      setLoading(true);
      setChatError(null);
      setSuggestions([]);
      setMessages((currentMessages) => [...currentMessages, createMessage('user', trimmedMessage)]);

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
          return;
        }

        if (assistantResponse.content.trim()) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', assistantResponse.content),
          ]);
        }
      } catch (mutationError) {
        setChatError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [client, createMessage, loading, sessionId]
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-[1400px] flex-col bg-white p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <InspirationForm
          disabled={loading}
          error={formError}
          onChange={handleFormChange}
          onSubmit={generateInspiration}
          values={formValues}
        />

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
    </div>
  );
}
