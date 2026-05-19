'use client';

import { type FormEvent, useState } from 'react';

type AiSenderProps = {
  loading: boolean;
  onSend: (message: string) => void;
};

export function AiSender({ loading, onSend }: AiSenderProps) {
  const [message, setMessage] = useState('');
  const trimmedMessage = message.trim();

  function handleMessageChange(event: FormEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget as unknown as { value: string };

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
    <form aria-label="发送消息表单" className="ai-sender" onSubmit={handleSubmit}>
      <label className="ai-sender__label" htmlFor="chat-message-input">
        消息输入
      </label>
      <div className="ai-sender__row">
        <textarea
          aria-label="消息输入"
          className="ai-sender__textarea"
          disabled={loading}
          id="chat-message-input"
          onChange={handleMessageChange}
          placeholder="输入消息..."
          rows={3}
          value={message}
        />
        <button
          aria-label="发送消息"
          className="ai-sender__button"
          disabled={loading || !trimmedMessage}
          type="submit"
        >
          发送
        </button>
      </div>
    </form>
  );
}
