'use client';

import { ArrowRight, Bot, User } from 'lucide-react';
import Link from 'next/link';
import Markdown from 'react-markdown';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: {
    href: string;
    label: string;
  };
};

type AiMessageBubbleProps = {
  message: ChatMessage;
};

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <article
      aria-label={isUser ? '用户消息' : '助手消息'}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
          isUser
            ? 'bg-rose-100 text-rose-600'
            : 'bg-gradient-to-br from-orange-400 to-rose-500 text-white'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl p-4 shadow-sm ${
            isUser
              ? 'rounded-tr-sm bg-rose-500 text-white'
              : 'rounded-tl-sm bg-white text-slate-800 ring-1 ring-slate-200/60'
          }`}
        >
          <div
            className={`text-sm leading-6 break-words ${
              isUser
                ? '[&_a]:text-white [&_code]:bg-white/15'
                : '[&_a]:text-rose-600 [&_code]:bg-slate-100'
            } [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_img]:my-4 [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+_p]:mt-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-white [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5`}
          >
            <Markdown
              components={{
                img: ({ node, ...props }) => {
                  void node;

                  return (
                    <img
                      {...props}
                      className="my-4 h-auto max-w-full rounded-xl border border-slate-100 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  );
                },
              }}
            >
              {message.content}
            </Markdown>
          </div>
          {!isUser && message.action ? (
            <Link
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 focus:ring-2 focus:ring-rose-300 focus:outline-none"
              href={message.action.href}
            >
              <span>{message.action.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
