'use client';

import { Send } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';

type AiSenderProps = {
  loading: boolean;
  onSend: (message: string) => void;
};

type InputValueTarget = {
  value: string;
};

export function AiSender({ loading, onSend }: AiSenderProps) {
  const [message, setMessage] = useState('');
  const trimmedMessage = message.trim();

  function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget as unknown as InputValueTarget;

    setMessage(target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedMessage || loading) {
      return;
    }

    onSend(trimmedMessage);
    setMessage('');
  }

  return (
    <form
      aria-label="发送消息表单"
      className="shrink-0 border-t border-slate-100 bg-white p-4"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="chat-message-input">
        消息输入
      </label>
      <div className="relative flex items-center">
        <input
          aria-label="消息输入"
          className="w-full rounded-xl border-0 bg-slate-50 py-3 pr-12 pl-4 text-sm text-slate-800 ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={loading}
          id="chat-message-input"
          onChange={handleMessageChange}
          placeholder="输入您的教学问题或需求，例如：如何处理课堂上的突发情况？"
          type="text"
          value={message}
        />
        <button
          aria-label="发送消息"
          className="absolute right-2 rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={loading || !trimmedMessage}
          type="submit"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
