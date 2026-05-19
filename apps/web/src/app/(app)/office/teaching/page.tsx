'use client';

import type { AiStreamEvent } from '@package/shared';
import { type FormEvent, useCallback, useRef, useState } from 'react';

import {
  defaultFollowUpSuggestions,
  getDefaultTeachingLevel,
  isTeachingLevelValidForMode,
  type TeachingExampleCard,
  teachingExampleCards,
  type TeachingFormValues,
  type TeachingGenerateInput,
  type TeachingMode,
  teachingModeCopy,
} from '../../../../components/teaching/teaching.data';
import { TeachingContextForm } from '../../../../components/teaching/teaching-context-form';
import { TeachingExampleCards } from '../../../../components/teaching/teaching-example-cards';
import { TeachingInputModeToggle } from '../../../../components/teaching/teaching-input-mode-toggle';
import { TeachingPromptInput } from '../../../../components/teaching/teaching-prompt-input';
import {
  type TeachingMessage,
  TeachingResultPanel,
} from '../../../../components/teaching/teaching-result-panel';
import { TransformationLevelSelector } from '../../../../components/teaching/transformation-level-selector';
import { useTrpcClient } from '../../../../trpc/provider';

const initialFormValues: TeachingFormValues = {
  level: 'similar',
  mode: 'variant',
  prompt: '',
  stage: '初中',
  subject: '数学',
};

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
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

function getFollowUpSuggestions(suggestions: string[]) {
  return [
    ...defaultFollowUpSuggestions,
    ...suggestions.filter((suggestion) => !defaultFollowUpSuggestions.includes(suggestion)),
  ];
}

function createGenerateInput(values: TeachingFormValues, prompt: string): TeachingGenerateInput {
  const baseInput = {
    prompt,
    stage: values.stage,
    subject: values.subject,
  };

  if (values.mode === 'variant') {
    const level = isTeachingLevelValidForMode(values.level, 'variant')
      ? values.level
      : getDefaultTeachingLevel('variant');

    return {
      ...baseInput,
      level,
      mode: values.mode,
    };
  }

  const level = isTeachingLevelValidForMode(values.level, 'knowledge')
    ? values.level
    : getDefaultTeachingLevel('knowledge');

  return {
    ...baseInput,
    level,
    mode: values.mode,
  };
}

function formatUserMessage(values: TeachingFormValues, prompt: string) {
  return `${teachingModeCopy[values.mode].userMessageLabel}（${values.stage} · ${values.subject}）\n${prompt}`;
}

export default function OfficeTeachingPage() {
  const client = useTrpcClient();
  const nextMessageId = useRef(0);
  const [formValues, setFormValues] = useState<TeachingFormValues>(initialFormValues);
  const [messages, setMessages] = useState<TeachingMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const createMessage = useCallback(
    (role: TeachingMessage['role'], content: string): TeachingMessage => {
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
    (nextValues: TeachingFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.prompt.trim()) {
        setFormError(null);
      }
    },
    [formError]
  );

  const handleModeChange = useCallback((mode: TeachingMode) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      level: isTeachingLevelValidForMode(currentValues.level, mode)
        ? currentValues.level
        : getDefaultTeachingLevel(mode),
      mode,
    }));
    setFormError(null);
  }, []);

  const generateTeaching = useCallback(
    async (values: TeachingFormValues, promptOverride?: string) => {
      const prompt = (promptOverride ?? values.prompt).trim();

      if (!prompt) {
        setFormError('请先填写原题或知识点。');
        return;
      }

      if (loading) {
        return;
      }

      setLoading(true);
      setFormError(null);
      setResultError(null);
      setSessionId(undefined);
      setSuggestions([]);
      setMessages([createMessage('user', formatUserMessage(values, prompt))]);

      try {
        const result = await client.ai.teaching.generate.mutate(
          createGenerateInput(values, prompt)
        );
        const assistantResponse = collectAssistantResponse(result.events);

        setSessionId(result.sessionId);

        if (assistantResponse.errorMessage) {
          setResultError(assistantResponse.errorMessage);
          return;
        }

        setSuggestions(getFollowUpSuggestions(assistantResponse.suggestions));

        if (assistantResponse.content.trim()) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', assistantResponse.content),
          ]);
        }
      } catch (mutationError) {
        setResultError(
          getMutationErrorMessage(mutationError, '变身遇到了一点障碍，请检查网络或稍后再试。')
        );
      } finally {
        setLoading(false);
      }
    },
    [client, createMessage, loading]
  );

  const handleExampleSelect = useCallback(
    (item: TeachingExampleCard) => {
      const nextValues: TeachingFormValues = {
        ...formValues,
        prompt: item.content,
        subject: item.subject,
      };

      setFormValues((currentValues) => ({
        ...currentValues,
        subject: item.subject,
      }));
      void generateTeaching(nextValues, item.content);
    },
    [formValues, generateTeaching]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void generateTeaching(formValues);
    },
    [formValues, generateTeaching]
  );

  const handleFollowUp = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();

      if (!sessionId || !trimmedMessage || loading) {
        return;
      }

      setLoading(true);
      setResultError(null);
      setSuggestions([]);
      setMessages((currentMessages) => [...currentMessages, createMessage('user', trimmedMessage)]);

      try {
        const result = await client.ai.teaching.followUp.mutate({
          message: trimmedMessage,
          sessionId,
        });
        const assistantResponse = collectAssistantResponse(result.events);

        setSessionId(result.sessionId);

        if (assistantResponse.errorMessage) {
          setResultError(assistantResponse.errorMessage);
          return;
        }

        setSuggestions(getFollowUpSuggestions(assistantResponse.suggestions));

        if (assistantResponse.content.trim()) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', assistantResponse.content),
          ]);
        }
      } catch (mutationError) {
        setResultError(getMutationErrorMessage(mutationError, '追问失败了，请稍后再试。'));
      } finally {
        setLoading(false);
      }
    },
    [client, createMessage, loading, sessionId]
  );

  const isPromptEmpty = !formValues.prompt.trim();

  return (
    <div className="teaching-page">
      <section aria-label="命题输入" className="teaching-page__controls">
        <form aria-label="教学命题表单" className="teaching-form" onSubmit={handleSubmit}>
          <TeachingContextForm disabled={loading} onChange={handleFormChange} values={formValues} />
          <TeachingInputModeToggle
            disabled={loading}
            mode={formValues.mode}
            onChange={handleModeChange}
          />
          <TeachingPromptInput
            disabled={loading}
            error={formError}
            onChange={handleFormChange}
            values={formValues}
          />
          {formError ? (
            <div className="teaching-form__alert" id="teaching-prompt-error" role="alert">
              {formError}
            </div>
          ) : null}
          <TransformationLevelSelector
            disabled={loading}
            onChange={handleFormChange}
            values={formValues}
          />
          <button
            className="teaching-form__submit"
            disabled={loading || isPromptEmpty}
            type="submit"
          >
            {loading
              ? teachingModeCopy[formValues.mode].loadingLabel
              : teachingModeCopy[formValues.mode].submitLabel}
          </button>
        </form>

        <TeachingExampleCards
          disabled={loading}
          examples={teachingExampleCards}
          onSelect={handleExampleSelect}
        />
      </section>

      <TeachingResultPanel
        disabled={loading}
        error={resultError}
        messages={messages}
        onFollowUp={handleFollowUp}
        sessionId={sessionId}
        suggestions={suggestions}
      />

      <style>{`
        .teaching-page {
          display: grid;
          min-width: 0;
          flex: 1;
          grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
          gap: 16px;
        }

        .teaching-page__controls {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }

        .teaching-form,
        .teaching-examples,
        .teaching-result {
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .teaching-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .teaching-form__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .teaching-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
        }

        .teaching-field__label,
        .teaching-follow-up__label {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .teaching-field__control,
        .teaching-follow-up__input {
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

        .teaching-field__textarea {
          min-height: 132px;
          resize: vertical;
        }

        .teaching-field__control:focus,
        .teaching-follow-up__input:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .teaching-field__control:disabled,
        .teaching-follow-up__input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .teaching-mode,
        .teaching-levels {
          min-width: 0;
          margin: 0;
          border: 0;
          padding: 0;
        }

        .teaching-mode__options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 6px;
        }

        .teaching-mode__button,
        .teaching-levels__button,
        .teaching-examples__item,
        .teaching-suggestions__button {
          cursor: pointer;
          border: 1px solid #d8dee8;
          background: #f8fafb;
          color: inherit;
          font: inherit;
        }

        .teaching-mode__button {
          min-height: 38px;
          border-radius: 6px;
          color: #334155;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 8px 10px;
        }

        .teaching-mode__button--active,
        .teaching-levels__button--active {
          border-color: #12645c;
          background: #eef7f5;
          color: #0f4f47;
        }

        .teaching-levels__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
        }

        .teaching-levels__button {
          display: flex;
          min-height: 58px;
          flex-direction: column;
          gap: 4px;
          border-radius: 6px;
          padding: 9px 10px;
          text-align: left;
        }

        .teaching-levels__button:hover:not(:disabled),
        .teaching-mode__button:hover:not(:disabled),
        .teaching-examples__item:hover:not(:disabled),
        .teaching-suggestions__button:hover:not(:disabled) {
          border-color: #12645c;
          background: #f1f8f6;
        }

        .teaching-levels__title {
          color: #17202a;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
        }

        .teaching-levels__description,
        .teaching-examples__meta,
        .teaching-examples__description {
          color: #5f6b7a;
          font-size: 12px;
          line-height: 17px;
        }

        .teaching-form__alert,
        .teaching-result__alert {
          border: 1px solid #f0b8b8;
          border-radius: 6px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 13px;
          line-height: 18px;
          padding: 8px 10px;
        }

        .teaching-form__submit,
        .teaching-follow-up__button {
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

        .teaching-form__submit:hover:not(:disabled),
        .teaching-follow-up__button:hover:not(:disabled) {
          background: #0f4f47;
        }

        .teaching-form__submit:disabled,
        .teaching-follow-up__button:disabled,
        .teaching-mode__button:disabled,
        .teaching-levels__button:disabled,
        .teaching-examples__item:disabled,
        .teaching-suggestions__button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .teaching-examples {
          padding: 14px;
        }

        .teaching-examples__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .teaching-examples__header h2 {
          margin: 0;
          color: #111827;
          font-size: 15px;
          line-height: 22px;
        }

        .teaching-examples__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .teaching-examples__item {
          display: flex;
          width: 100%;
          flex-direction: column;
          gap: 5px;
          border-radius: 6px;
          padding: 10px;
          text-align: left;
        }

        .teaching-examples__title {
          color: #17202a;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
        }

        .teaching-result {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .teaching-result__messages {
          display: flex;
          min-height: 520px;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
          padding: 14px;
        }

        .teaching-result__empty {
          display: flex;
          min-height: 320px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5f6b7a;
          text-align: center;
        }

        .teaching-result__empty h2 {
          margin: 0 0 8px;
          color: #17202a;
          font-size: 20px;
          line-height: 28px;
        }

        .teaching-result__empty p {
          max-width: 460px;
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .teaching-result__loading {
          align-self: flex-start;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f6f7f9;
          color: #4b5563;
          font-size: 14px;
          line-height: 20px;
          padding: 10px 12px;
        }

        .teaching-message {
          display: flex;
          max-width: min(780px, 88%);
          flex-direction: column;
          gap: 6px;
        }

        .teaching-message--user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .teaching-message--assistant {
          align-self: flex-start;
          align-items: flex-start;
        }

        .teaching-message__meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
        }

        .teaching-message__copy {
          cursor: pointer;
          border: 0;
          background: transparent;
          color: #12645c;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
          padding: 0;
        }

        .teaching-message__content {
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

        .teaching-message--user .teaching-message__content {
          border-color: #12645c;
          background: #12645c;
          color: #ffffff;
        }

        .teaching-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .teaching-suggestions__button {
          min-width: 0;
          max-width: 100%;
          min-height: 34px;
          border-radius: 999px;
          color: #334155;
          font-size: 13px;
          line-height: 18px;
          overflow-wrap: anywhere;
          padding: 7px 12px;
          text-align: left;
          word-break: break-word;
        }

        .teaching-follow-up {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .teaching-follow-up__row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .teaching-follow-up__button {
          min-width: 76px;
        }

        @media (max-width: 980px) {
          .teaching-page {
            grid-template-columns: 1fr;
          }

          .teaching-result__messages {
            min-height: 380px;
          }
        }

        @media (max-width: 560px) {
          .teaching-form__grid,
          .teaching-mode__options,
          .teaching-follow-up__row {
            grid-template-columns: 1fr;
          }

          .teaching-message {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
