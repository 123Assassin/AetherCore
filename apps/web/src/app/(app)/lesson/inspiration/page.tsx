'use client';

import type { AiStreamEvent } from '@package/shared';
import { useCallback, useRef, useState } from 'react';

import { FeaturedInspirationCases } from '../../../../components/inspiration/featured-inspiration-cases';
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
    `生成课程灵感：${values.grade} · ${values.subject} · ${values.topic.trim()}`,
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
    <div className="inspiration-page">
      <section aria-label="灵感输入" className="inspiration-page__controls">
        <InspirationForm
          disabled={loading}
          error={formError}
          onChange={handleFormChange}
          onSubmit={generateInspiration}
          values={formValues}
        />
        <FeaturedInspirationCases
          cases={featuredInspirationCases}
          disabled={loading}
          onSelect={handleFeaturedCaseSelect}
        />
      </section>

      <InspirationChatPanel
        disabled={loading}
        error={chatError}
        messages={messages}
        onFollowUp={handleFollowUp}
        sessionId={sessionId}
        suggestions={suggestions}
      />

      <style>{`
        .inspiration-page {
          display: grid;
          min-width: 0;
          flex: 1;
          grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
          gap: 16px;
        }

        .inspiration-page__controls {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }

        .inspiration-form,
        .featured-inspiration,
        .inspiration-chat {
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .inspiration-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .inspiration-form__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .inspiration-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
        }

        .inspiration-field__label,
        .inspiration-follow-up__label {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .inspiration-field__control,
        .inspiration-follow-up__input {
          width: 100%;
          min-height: 38px;
          border: 1px solid #cbd5df;
          border-radius: 6px;
          color: #17202a;
          font: inherit;
          font-size: 14px;
          line-height: 20px;
          padding: 8px 10px;
        }

        .inspiration-field__textarea {
          min-height: 92px;
          resize: vertical;
        }

        .inspiration-field__control:focus,
        .inspiration-follow-up__input:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .inspiration-field__control:disabled,
        .inspiration-follow-up__input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .inspiration-form__alert,
        .inspiration-chat__alert {
          border: 1px solid #f0b8b8;
          border-radius: 6px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 13px;
          line-height: 18px;
          padding: 8px 10px;
        }

        .inspiration-form__submit,
        .inspiration-follow-up__button {
          min-height: 38px;
          cursor: pointer;
          border: 0;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 8px 14px;
        }

        .inspiration-form__submit:hover:not(:disabled),
        .inspiration-follow-up__button:hover:not(:disabled) {
          background: #0f4f47;
        }

        .inspiration-form__submit:disabled,
        .inspiration-follow-up__button:disabled,
        .featured-inspiration__item:disabled,
        .inspiration-suggestions__button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .featured-inspiration {
          padding: 14px;
        }

        .featured-inspiration__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .featured-inspiration__header h2 {
          margin: 0;
          color: #111827;
          font-size: 15px;
          line-height: 22px;
        }

        .featured-inspiration__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .featured-inspiration__item {
          display: flex;
          width: 100%;
          cursor: pointer;
          flex-direction: column;
          gap: 5px;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #f8fafb;
          color: inherit;
          font: inherit;
          padding: 10px;
          text-align: left;
        }

        .featured-inspiration__item:hover:not(:disabled) {
          border-color: #12645c;
          background: #f1f8f6;
        }

        .featured-inspiration__title {
          color: #17202a;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
        }

        .featured-inspiration__meta,
        .featured-inspiration__description {
          color: #5f6b7a;
          font-size: 12px;
          line-height: 17px;
        }

        .inspiration-chat {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .inspiration-chat__messages {
          display: flex;
          min-height: 420px;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
          padding: 14px;
        }

        .inspiration-chat__empty {
          display: flex;
          min-height: 280px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5f6b7a;
          text-align: center;
        }

        .inspiration-chat__empty h2 {
          margin: 0 0 8px;
          color: #17202a;
          font-size: 20px;
          line-height: 28px;
        }

        .inspiration-chat__empty p {
          max-width: 420px;
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .inspiration-chat__loading {
          align-self: flex-start;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f6f7f9;
          color: #4b5563;
          font-size: 14px;
          line-height: 20px;
          padding: 10px 12px;
        }

        .inspiration-message {
          display: flex;
          max-width: min(760px, 88%);
          flex-direction: column;
          gap: 6px;
        }

        .inspiration-message--user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .inspiration-message--assistant {
          align-self: flex-start;
          align-items: flex-start;
        }

        .inspiration-message__meta {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
        }

        .inspiration-message__content {
          white-space: pre-wrap;
          word-break: break-word;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f8fafb;
          color: #17202a;
          font-size: 14px;
          line-height: 22px;
          padding: 11px 13px;
        }

        .inspiration-message--user .inspiration-message__content {
          border-color: #12645c;
          background: #12645c;
          color: #ffffff;
        }

        .inspiration-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .inspiration-suggestions__button {
          min-height: 34px;
          cursor: pointer;
          border: 1px solid #cbd5df;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          font: inherit;
          font-size: 13px;
          line-height: 18px;
          padding: 7px 12px;
        }

        .inspiration-suggestions__button:hover:not(:disabled) {
          border-color: #12645c;
          color: #0f4f47;
        }

        .inspiration-follow-up {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .inspiration-follow-up__row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .inspiration-follow-up__button {
          min-width: 76px;
        }

        @media (max-width: 980px) {
          .inspiration-page {
            grid-template-columns: 1fr;
          }

          .inspiration-chat__messages {
            min-height: 340px;
          }
        }

        @media (max-width: 520px) {
          .inspiration-form__grid,
          .inspiration-follow-up__row {
            grid-template-columns: 1fr;
          }

          .inspiration-message {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
