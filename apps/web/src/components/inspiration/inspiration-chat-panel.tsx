'use client';

import { Bot, Check, Copy, MessageSquarePlus, Send, Sparkles, User } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';

import { FeaturedInspirationCases } from './featured-inspiration-cases';
import type { FeaturedInspirationCase } from './inspiration.data';

export type InspirationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type InspirationChatPanelProps = {
  disabled: boolean;
  error: string | null;
  featuredCases: FeaturedInspirationCase[];
  messages: InspirationMessage[];
  onFeaturedCaseSelect: (item: FeaturedInspirationCase) => void;
  onFollowUp: (message: string) => void;
  sessionId: string | undefined;
  suggestions: string[];
};

type ScrollAnchorElement = {
  scrollIntoView: (options?: { behavior?: 'smooth' }) => void;
};

type BrowserClipboard = {
  navigator?: {
    clipboard?: {
      writeText: (text: string) => Promise<void>;
    };
  };
  setTimeout?: (handler: () => void, timeout: number) => void;
};

const markdownComponents: Components = {
  img: ({ node, ...props }) => {
    void node;

    return (
      <span className="my-4 block">
        <img
          {...props}
          alt={props.alt ?? ''}
          className="h-auto max-w-full rounded-xl border border-slate-100 shadow-sm"
          referrerPolicy="no-referrer"
        />
        <span className="mt-1 block text-center text-[10px] text-slate-400 italic">
          视觉辅助：AI 建议的类比示意图
        </span>
      </span>
    );
  },
};

export function InspirationChatPanel({
  disabled,
  error,
  featuredCases,
  messages,
  onFeaturedCaseSelect,
  onFollowUp,
  sessionId,
  suggestions,
}: InspirationChatPanelProps) {
  const [followUpText, setFollowUpText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<ScrollAnchorElement | null>(null);
  const trimmedFollowUpText = followUpText.trim();
  const canSendFollowUp = Boolean(sessionId && trimmedFollowUpText && !disabled);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [disabled, messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSendFollowUp) {
      return;
    }

    onFollowUp(trimmedFollowUpText);
    setFollowUpText('');
  }

  function handleSuggestionClick(suggestion: string) {
    if (disabled || !sessionId) {
      return;
    }

    onFollowUp(suggestion);
  }

  async function handleCopy(message: InspirationMessage) {
    const browser = globalThis as BrowserClipboard;

    await browser.navigator?.clipboard?.writeText(message.content);
    setCopiedMessageId(message.id);
    browser.setTimeout?.(() => setCopiedMessageId(null), 2000);
  }

  return (
    <section
      aria-label="灵感结果"
      className="relative flex min-h-[500px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 lg:min-h-0"
    >
      {messages.length === 0 && !disabled ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/30 p-8">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 shadow-inner">
              <Sparkles aria-hidden="true" className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-700">欢迎来到知识精讲橱窗</h2>
            <p className="mx-auto max-w-md text-sm text-slate-500">
              我们为您准备了几个理科“硬骨头”的神级拆解案例，点击即可快速体验 AI 的降维打击能力。
            </p>
          </div>

          <FeaturedInspirationCases
            cases={featuredCases}
            disabled={disabled}
            onSelect={onFeaturedCaseSelect}
          />

          <div className="mt-12 flex items-center gap-2 text-xs font-medium text-slate-400">
            <div className="h-px w-8 bg-slate-200" />
            或者在左侧输入您自己的知识点
            <div className="h-px w-8 bg-slate-200" />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-1 flex-col gap-6 overflow-y-auto bg-slate-50/30 p-4 md:p-6"
          role="log"
        >
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <article
                aria-label={isUser ? '灵感用户消息' : '灵感助手消息'}
                className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
                key={message.id}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
                    isUser
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                  }`}
                >
                  {isUser ? (
                    <User aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Bot aria-hidden="true" className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`group relative max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`rounded-2xl p-4 shadow-sm ${
                      isUser
                        ? 'rounded-tr-sm bg-red-600 text-white'
                        : 'rounded-tl-sm bg-white text-slate-800 ring-1 ring-slate-200/60'
                    }`}
                  >
                    <div className="max-w-none text-sm leading-6 text-inherit [&_a]:font-semibold [&_a]:text-red-600 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
                      <Markdown components={markdownComponents}>{message.content}</Markdown>
                    </div>
                  </div>

                  {!isUser ? (
                    <button
                      aria-label="复制内容"
                      className="absolute top-2 -right-12 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      onClick={() => void handleCopy(message)}
                      title="复制内容"
                      type="button"
                    >
                      {copiedMessageId === message.id ? (
                        <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}

                  {!isUser &&
                  message.id === messages.at(-1)?.id &&
                  suggestions.length > 0 &&
                  !disabled ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-3 flex items-center gap-1 text-xs font-bold text-slate-400">
                        <MessageSquarePlus aria-hidden="true" className="h-3.5 w-3.5" />{' '}
                        深度追问建议：
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            aria-label={`发送追问建议：${suggestion}`}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-red-50 hover:text-red-700 hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
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
              </article>
            );
          })}

          {disabled ? (
            <div aria-live="polite" className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm">
                <Bot aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white p-4 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                正在生成课程灵感...
              </div>
            </div>
          ) : null}
          <div
            ref={(element) => {
              messagesEndRef.current = element as ScrollAnchorElement | null;
            }}
          />
        </div>
      )}

      {error ? (
        <div
          aria-live="assertive"
          className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {messages.length > 0 ? (
        <form
          aria-label="灵感追问表单"
          className="shrink-0 border-t border-slate-100 bg-white p-4"
          onSubmit={handleSubmit}
        >
          <div className="relative flex items-center">
            <input
              aria-label="追问"
              className="w-full rounded-xl border-0 bg-slate-50 py-3 pr-12 pl-4 text-sm ring-1 ring-slate-200 transition-all outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || !sessionId}
              onChange={(event) => {
                const target = event.currentTarget as unknown as { value: string };

                setFollowUpText(target.value);
              }}
              placeholder={sessionId ? '还有什么要求？直接告诉我...' : '先生成课程灵感'}
              type="text"
              value={followUpText}
            />
            <button
              aria-label="发送追问"
              className="absolute right-2 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40 disabled:hover:bg-transparent"
              disabled={!canSendFollowUp}
              type="submit"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
