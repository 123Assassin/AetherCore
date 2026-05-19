'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

export type TeachingMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type TeachingResultPanelProps = {
  disabled: boolean;
  error: string | null;
  messages: TeachingMessage[];
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
  messages,
  onFollowUp,
  sessionId,
  suggestions,
}: TeachingResultPanelProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const clearCopyStateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    return () => {
      if (clearCopyStateRef.current) {
        clearTimeout(clearCopyStateRef.current);
      }
    };
  }, []);

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
    <section aria-label="命题结果" className="teaching-result">
      <div className="teaching-result__messages" role="log">
        {!hasMessages ? (
          <div className="teaching-result__empty">
            <h2>{disabled ? '正在生成题目' : '选择一个经典案例开始'}</h2>
            <p>
              {disabled
                ? '命题专家正在整理题干、考点和变式方向。'
                : '也可以填写左侧内容，把普通练习转化成更适合课堂讨论的启发式题目。'}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <article
                aria-label={isUser ? '命题用户消息' : '命题助手消息'}
                className={
                  isUser
                    ? 'teaching-message teaching-message--user'
                    : 'teaching-message teaching-message--assistant'
                }
                key={message.id}
              >
                <div className="teaching-message__meta">
                  <span>{isUser ? '你' : 'AetherCore'}</span>
                  {!isUser ? (
                    <button
                      className="teaching-message__copy"
                      onClick={() => void copyMessage(message.content, message.id)}
                      type="button"
                    >
                      {copiedMessageId === message.id ? '已复制' : '复制'}
                    </button>
                  ) : null}
                </div>
                <div className="teaching-message__content">{message.content}</div>
              </article>
            );
          })
        )}

        {disabled ? (
          <div aria-live="polite" className="teaching-result__loading">
            命题专家思考中...
          </div>
        ) : null}
      </div>

      {copyError ? (
        <div aria-live="assertive" className="teaching-result__alert" role="alert">
          {copyError}
        </div>
      ) : null}

      {error ? (
        <div aria-live="assertive" className="teaching-result__alert" role="alert">
          {error}
        </div>
      ) : null}

      {hasMessages && suggestions.length > 0 ? (
        <section aria-label="追问建议" className="teaching-suggestions">
          {suggestions.map((suggestion) => (
            <button
              aria-label={`发送追问建议：${suggestion}`}
              className="teaching-suggestions__button"
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

      {hasMessages ? (
        <form aria-label="命题追问表单" className="teaching-follow-up" onSubmit={handleSubmit}>
          <label className="teaching-follow-up__label" htmlFor="teaching-follow-up-input">
            追问
          </label>
          <div className="teaching-follow-up__row">
            <input
              aria-describedby={followUpError ? 'teaching-follow-up-error' : undefined}
              aria-invalid={followUpError ? true : undefined}
              aria-label="追问"
              className="teaching-follow-up__input"
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
            <button
              aria-label="发送追问"
              className="teaching-follow-up__button"
              disabled={disabled || !sessionId}
              type="submit"
            >
              发送
            </button>
          </div>
          {followUpError ? (
            <div className="teaching-result__alert" id="teaching-follow-up-error" role="alert">
              {followUpError}
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
