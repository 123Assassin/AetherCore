'use client';

import { type FormEvent, useState } from 'react';

export type InspirationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type InspirationChatPanelProps = {
  disabled: boolean;
  error: string | null;
  messages: InspirationMessage[];
  onFollowUp: (message: string) => void;
  sessionId: string | undefined;
  suggestions: string[];
};

export function InspirationChatPanel({
  disabled,
  error,
  messages,
  onFollowUp,
  sessionId,
  suggestions,
}: InspirationChatPanelProps) {
  const [followUpText, setFollowUpText] = useState('');
  const trimmedFollowUpText = followUpText.trim();
  const canSendFollowUp = Boolean(sessionId && trimmedFollowUpText && !disabled);

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

  return (
    <section aria-label="灵感结果" className="inspiration-chat">
      <div className="inspiration-chat__messages" role="log">
        {messages.length === 0 ? (
          <div className="inspiration-chat__empty">
            <h2>等待生成结果</h2>
            <p>填写主题或选择精选案例后，生成的课程灵感会显示在这里。</p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <article
                aria-label={isUser ? '灵感用户消息' : '灵感助手消息'}
                className={
                  isUser
                    ? 'inspiration-message inspiration-message--user'
                    : 'inspiration-message inspiration-message--assistant'
                }
                key={message.id}
              >
                <div className="inspiration-message__meta">{isUser ? '你' : 'AetherCore'}</div>
                <div className="inspiration-message__content">{message.content}</div>
              </article>
            );
          })
        )}

        {disabled ? (
          <div aria-live="polite" className="inspiration-chat__loading">
            正在生成课程灵感...
          </div>
        ) : null}
      </div>

      {error ? (
        <div aria-live="assertive" className="inspiration-chat__alert" role="alert">
          {error}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <section aria-label="追问建议" className="inspiration-suggestions">
          {suggestions.map((suggestion) => (
            <button
              aria-label={`发送追问建议：${suggestion}`}
              className="inspiration-suggestions__button"
              disabled={disabled || !sessionId}
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </section>
      ) : null}

      <form aria-label="灵感追问表单" className="inspiration-follow-up" onSubmit={handleSubmit}>
        <label className="inspiration-follow-up__label" htmlFor="inspiration-follow-up-input">
          追问
        </label>
        <div className="inspiration-follow-up__row">
          <input
            aria-label="追问"
            className="inspiration-follow-up__input"
            disabled={disabled || !sessionId}
            id="inspiration-follow-up-input"
            onChange={(event) => {
              const target = event.currentTarget as unknown as { value: string };

              setFollowUpText(target.value);
            }}
            placeholder={sessionId ? '继续细化活动、评价或材料...' : '先生成课程灵感'}
            type="text"
            value={followUpText}
          />
          <button
            aria-label="发送追问"
            className="inspiration-follow-up__button"
            disabled={!canSendFollowUp}
            type="submit"
          >
            发送
          </button>
        </div>
      </form>
    </section>
  );
}
