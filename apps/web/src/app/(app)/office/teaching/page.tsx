'use client';

import type { AiStreamEvent } from '@package/shared';
import { RefreshCw, Sparkles } from 'lucide-react';
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
    <div className="flex h-full min-h-0 flex-col bg-white p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <section
          aria-label="命题输入"
          className="custom-scrollbar h-full w-full shrink-0 overflow-y-auto pr-0 lg:w-[420px] lg:pr-2"
        >
          <form
            aria-label="教学命题表单"
            className="flex flex-col gap-8 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">
                  1
                </span>
                <label className="text-sm font-black text-slate-700">配置教学上下文</label>
              </div>
              <TeachingContextForm
                disabled={loading}
                onChange={handleFormChange}
                values={formValues}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">
                    2
                  </span>
                  <label className="text-sm font-black text-slate-700">
                    {teachingModeCopy[formValues.mode].inputLabel}
                  </label>
                </div>
                <TeachingInputModeToggle
                  disabled={loading}
                  mode={formValues.mode}
                  onChange={handleModeChange}
                />
              </div>
              <TeachingPromptInput
                disabled={loading}
                error={formError}
                onChange={handleFormChange}
                values={formValues}
              />
              {formError ? (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
                  id="teaching-prompt-error"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">
                  3
                </span>
                <label className="text-sm font-black text-slate-700">
                  {teachingModeCopy[formValues.mode].levelLabel}
                </label>
              </div>
              <TransformationLevelSelector
                disabled={loading}
                onChange={handleFormChange}
                values={formValues}
              />
            </div>

            <button
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-blue-600 py-4.5 font-black text-white shadow-2xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:grayscale"
              disabled={loading || isPromptEmpty}
              type="submit"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 transition-opacity group-hover:opacity-100" />
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5 text-blue-400" />
              )}
              <span className="relative z-10">
                {loading
                  ? teachingModeCopy[formValues.mode].loadingLabel
                  : teachingModeCopy[formValues.mode].submitLabel}
              </span>
            </button>
          </form>
        </section>

        <TeachingResultPanel
          disabled={loading}
          error={resultError}
          examples={teachingExampleCards}
          messages={messages}
          onExampleSelect={handleExampleSelect}
          onFollowUp={handleFollowUp}
          sessionId={sessionId}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
