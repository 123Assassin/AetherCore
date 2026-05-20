'use client';

import type { AiStreamEvent } from '@package/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import type { ChatMessage } from '../../../components/chat/ai-message-bubble';
import { AiSender } from '../../../components/chat/ai-sender';
import { ChatMessageList } from '../../../components/chat/chat-message-list';
import { SuggestionChips } from '../../../components/chat/suggestion-chips';
import { useTrpcClient } from '../../../trpc/provider';

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '消息发送失败，请稍后重试。';
}

function collectAssistantResponse(events: AiStreamEvent[]) {
  let content = '';
  let redirectTo: ChatWorkflowRoute | null = null;
  let suggestions: string[] = [];
  let errorMessage: string | null = null;

  for (const event of events) {
    if (event.type === 'delta') {
      content += event.content;
    }

    if (event.type === 'suggestions') {
      suggestions = event.suggestions;
    }

    if (event.type === 'workflow') {
      redirectTo = getChatWorkflowRoute(event.redirectTo);
    }

    if (event.type === 'error') {
      errorMessage = event.message;
    }
  }

  return { content, errorMessage, redirectTo, suggestions };
}

export default function ChatPage() {
  const client = useTrpcClient();
  const router = useRouter();
  const nextMessageId = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMessage = useCallback((role: ChatMessage['role'], content: string): ChatMessage => {
    nextMessageId.current += 1;

    return {
      content,
      id: `${role}-${nextMessageId.current}`,
      role,
    };
  }, []);

  const handleSend = useCallback(
    async (rawMessage: string) => {
      const trimmedMessage = rawMessage.trim();

      if (!trimmedMessage || loading) {
        return;
      }

      setLoading(true);
      setError(null);
      setSuggestions([]);
      setMessages((currentMessages) => [...currentMessages, createMessage('user', trimmedMessage)]);

      try {
        const result = await client.ai.chat.send.mutate({
          category: 'chat',
          ...(sessionId ? { sessionId } : {}),
          message: trimmedMessage,
        });
        const assistantResponse = collectAssistantResponse(result.events);

        setSessionId(result.sessionId);
        setSuggestions(assistantResponse.suggestions);

        if (assistantResponse.errorMessage) {
          setError(assistantResponse.errorMessage);
          return;
        }

        if (assistantResponse.content.trim()) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', assistantResponse.content),
          ]);
        }

        if (assistantResponse.redirectTo) {
          router.push(assistantResponse.redirectTo);
        }
      } catch (mutationError) {
        setError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [client, createMessage, loading, router, sessionId]
  );

  return (
    <div className="web-chat">
      <div className="web-chat__panel">
        <ChatMessageList loading={loading} messages={messages} />
        {error ? (
          <div aria-live="assertive" className="web-chat__alert" role="alert">
            {error}
          </div>
        ) : null}
        <SuggestionChips disabled={loading} onSelect={handleSend} suggestions={suggestions} />
        <AiSender loading={loading} onSend={handleSend} />
      </div>

      <style>{`
        .web-chat {
          display: flex;
          min-height: calc(100vh - 112px);
          width: 100%;
        }

        .web-chat__panel {
          display: flex;
          width: 100%;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }

        .web-chat__messages {
          display: flex;
          min-height: 360px;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
          padding: 18px;
        }

        .web-chat__empty {
          display: flex;
          min-height: 280px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5f6b7a;
          text-align: center;
        }

        .web-chat__empty h2 {
          margin: 0 0 8px;
          color: #17202a;
          font-size: 20px;
          line-height: 28px;
        }

        .web-chat__empty p {
          max-width: 440px;
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .web-chat__loading {
          align-self: flex-start;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f6f7f9;
          color: #4b5563;
          font-size: 14px;
          line-height: 20px;
          padding: 10px 12px;
        }

        .web-chat__alert {
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 14px;
          line-height: 20px;
          padding: 10px 12px;
        }

        .ai-message {
          display: flex;
          max-width: min(760px, 88%);
          flex-direction: column;
          gap: 6px;
        }

        .ai-message--user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .ai-message--assistant {
          align-self: flex-start;
          align-items: flex-start;
        }

        .ai-message__meta {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
        }

        .ai-message__content {
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

        .ai-message--user .ai-message__content {
          border-color: #12645c;
          background: #12645c;
          color: #ffffff;
        }

        .suggestion-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .suggestion-chips__button {
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

        .suggestion-chips__button:hover:not(:disabled) {
          border-color: #12645c;
          color: #0f4f47;
        }

        .suggestion-chips__button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .ai-sender {
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
          padding: 12px;
        }

        .ai-sender__label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .ai-sender__row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: stretch;
        }

        .ai-sender__textarea {
          width: 100%;
          min-height: 76px;
          resize: vertical;
          border: 1px solid #cbd5df;
          border-radius: 8px;
          color: #17202a;
          font: inherit;
          font-size: 14px;
          line-height: 22px;
          padding: 10px 12px;
        }

        .ai-sender__textarea:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .ai-sender__textarea:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .ai-sender__button {
          min-width: 88px;
          cursor: pointer;
          border: 0;
          border-radius: 8px;
          background: #12645c;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 0 18px;
        }

        .ai-sender__button:hover:not(:disabled) {
          background: #0f4f47;
        }

        .ai-sender__button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        @media (max-width: 760px) {
          .web-chat {
            min-height: calc(100vh - 154px);
          }

          .web-chat__messages {
            min-height: 300px;
            padding: 14px;
          }

          .ai-message {
            max-width: 94%;
          }

          .ai-sender__row {
            grid-template-columns: 1fr;
          }

          .ai-sender__button {
            min-height: 42px;
          }
        }
      `}</style>
    </div>
  );
}

const chatWorkflowRoutes = ['/office/comment', '/lesson/inspiration', '/office/teaching'] as const;

type ChatWorkflowRoute = (typeof chatWorkflowRoutes)[number];

function getChatWorkflowRoute(redirectTo: string): ChatWorkflowRoute | null {
  return (chatWorkflowRoutes as readonly string[]).includes(redirectTo)
    ? (redirectTo as ChatWorkflowRoute)
    : null;
}
