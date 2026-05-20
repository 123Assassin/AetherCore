'use client';

import { BookOpen, Bot, Check, Copy, MessageSquarePlus, Send, User } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';

import { AdLoadingBot } from '../sponsor/ad-system';
import type { TeachingExampleCard } from './teaching.data';
import { TeachingExampleCards } from './teaching-example-cards';

export type TeachingMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type TeachingResultPanelProps = {
  disabled: boolean;
  error: string | null;
  examples: TeachingExampleCard[];
  messages: TeachingMessage[];
  onExampleSelect: (item: TeachingExampleCard) => void;
  onFollowUp: (message: string) => void;
  sessionId: string | undefined;
  suggestions: string[];
};

type ClipboardNavigator = Navigator & {
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

const copyFailureMessage = '复制失败，请手动选择文本复制。';

export function TeachingResultPanel({
  disabled,
  error,
  examples,
  messages,
  onExampleSelect,
  onFollowUp,
  sessionId,
  suggestions,
}: TeachingResultPanelProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const clearCopyStateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    return () => {
      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }
    };
  }, []);

  useEffect(() => {
    (
      messagesEndRef.current as {
        scrollIntoView?: (options?: { behavior: 'smooth' }) => void;
      } | null
    )?.scrollIntoView?.({ behavior: 'smooth' });
  }, [disabled, messages]);

  async function copyMessage(content: string, id: string) {
    const clipboard = (navigator as ClipboardNavigator).clipboard;

    function clearCopiedState() {
      setCopiedMessageId(null);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
        clearCopyStateRef.current = null;
      }
    }

    if (!clipboard) {
      clearCopiedState();
      setCopyError(copyFailureMessage);
      return;
    }

    try {
      await clipboard.writeText(content);
      setCopyError(null);
      setCopiedMessageId(id);

      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }

      clearCopyStateRef.current = setTimeout(() => {
        setCopiedMessageId(null);
        clearCopyStateRef.current = null;
      }, 2000);
    } catch {
      clearCopiedState();
      setCopyError(copyFailureMessage);
    }
  }

  function submitFollowUp(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setFollowUpError('请输入追问要求。');
      return;
    }

    if (!sessionId || disabled) {
      return;
    }

    setFollowUpError(null);
    onFollowUp(trimmedMessage);
    setFollowUpText('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitFollowUp(followUpText);
  }

  function handleSuggestionClick(suggestion: string) {
    submitFollowUp(suggestion);
  }

  return (
    <section aria-label="命题结果" className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-slate-50/30">
        {!hasMessages && !disabled ? (
          <div className="custom-scrollbar flex flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50/30 p-8">
            <div className="mb-10 shrink-0 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-inner">
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-700">选择一个经典案例开始</h3>
              <p className="mx-auto max-w-md text-sm text-slate-500">
                点击下方卡片，快速体验如何将一道平庸的练习题转化为具有深度的启发式好题。
              </p>
            </div>

            <TeachingExampleCards
              disabled={disabled}
              examples={examples}
              onSelect={onExampleSelect}
            />

            <div className="mt-12 flex shrink-0 items-center gap-2 text-xs font-medium text-slate-400">
              <div className="h-px w-8 bg-slate-200" />
              或者在左侧置入您自己的原题
              <div className="h-px w-8 bg-slate-200" />
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-10 overflow-y-auto p-6 md:p-10">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const showSuggestions =
                !isUser && index === messages.length - 1 && !disabled && suggestions.length > 0;

              return (
                <div className={`flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`} key={message.id}>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
                      isUser
                        ? 'border border-slate-100 bg-white text-slate-400'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                    }`}
                  >
                    {isUser ? <User className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                  </div>

                  <div className="group relative max-w-[85%]">
                    <div
                      className={`rounded-[2rem] p-8 ${
                        isUser
                          ? 'border-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-200'
                          : 'border border-slate-100 bg-white text-slate-800 shadow-sm'
                      }`}
                    >
                      <div
                        className={`max-w-none text-sm leading-7 break-words whitespace-pre-wrap ${
                          isUser
                            ? 'text-white [&_p]:my-0'
                            : 'text-slate-800 [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-black [&_h3]:font-black [&_li]:my-1 [&_ol]:my-3 [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-3 [&_ul]:pl-5'
                        }`}
                      >
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>

                    {!isUser ? (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[10px] font-black tracking-wider text-slate-400 uppercase shadow-sm transition-all hover:text-blue-600"
                          onClick={() => void copyMessage(message.content, message.id)}
                          type="button"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedMessageId === message.id ? '已复制' : '复制结果'}
                        </button>
                      </div>
                    ) : null}

                    {showSuggestions ? (
                      <div className="mt-8 border-t border-slate-100 pt-8">
                        <p className="mb-4 pl-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          精细化调整策略
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion) => (
                            <button
                              aria-label={`发送追问建议：${suggestion}`}
                              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={disabled || !sessionId}
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              type="button"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {disabled ? <AdLoadingBot /> : null}
            <div ref={messagesEndRef} />
          </div>
        )}

        {copyError ? (
          <div
            aria-live="assertive"
            className="mx-8 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
            role="alert"
          >
            {copyError}
          </div>
        ) : null}

        {error ? (
          <div
            aria-live="assertive"
            className="mx-8 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {hasMessages ? (
          <form
            aria-label="命题追问表单"
            className="shrink-0 border-t border-slate-50 bg-white p-8"
            onSubmit={handleSubmit}
          >
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute top-1/2 left-5 -translate-y-1/2 text-slate-300">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <input
                aria-describedby={followUpError ? 'teaching-follow-up-error' : undefined}
                aria-invalid={followUpError ? true : undefined}
                aria-label="追问"
                className="w-full rounded-[2rem] border border-slate-200 bg-slate-50 py-5 pr-20 pl-14 text-sm font-bold transition-all outline-none placeholder:text-slate-300 hover:bg-slate-100/50 focus:ring-4 focus:ring-blue-600/10"
                disabled={disabled || !sessionId}
                id="teaching-follow-up-input"
                onChange={(event) => {
                  const target = event.currentTarget as unknown as { value: string };

                  setFollowUpText(target.value);

                  if (followUpError && target.value.trim()) {
                    setFollowUpError(null);
                  }
                }}
                placeholder="请输入追问要求，例如：换成选择题、增加难度、替换情境..."
                type="text"
                value={followUpText}
              />
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <button
                  aria-label="发送追问"
                  className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-20"
                  disabled={disabled || !sessionId}
                  type="submit"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
            {followUpError ? (
              <div
                className="mx-auto mt-4 max-w-4xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
                id="teaching-follow-up-error"
                role="alert"
              >
                {followUpError}
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}
