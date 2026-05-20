'use client';

import type { AiStreamEvent } from '@package/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import type { ChatMessage } from '../../../components/chat/ai-message-bubble';
import { AiSender } from '../../../components/chat/ai-sender';
import { ChatMessageList } from '../../../components/chat/chat-message-list';
import { AdLoadingBot } from '../../../components/sponsor/ad-system';
import { type Message, useChatHistory } from '../../../contexts/chat-history-context';
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

const defaultAssistantMessage: ChatMessage = {
  content:
    '老师您好！我是红笔AI，您的专属教学AI助手。您可以直接和我聊天，或者告诉我您的需求（比如：“帮我写个评语”、“我想备课”），我会为您打开对应的专业工具。',
  id: 'chat-default-assistant-message',
  role: 'assistant',
};

const defaultSuggestions = ['帮我写一份期末评语', '我想找点备课灵感', '如何处理课堂上的突发情况？'];

export default function ChatPage() {
  const client = useTrpcClient();
  const router = useRouter();
  const { currentSessionIds, sessions, setCurrentSessionId, upsertSession } = useChatHistory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSessionId = currentSessionIds.chat;
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId),
    [currentSessionId, sessions]
  );
  const messages = useMemo(
    () =>
      (activeSession?.messages ?? []).map((message): ChatMessage => {
        return {
          content: message.content,
          id: message.id,
          role: message.role,
        };
      }),
    [activeSession]
  );
  const suggestions = useMemo(() => {
    const lastMessage = activeSession?.messages.at(-1);

    return lastMessage?.role === 'assistant' ? (lastMessage.suggestions ?? []) : [];
  }, [activeSession]);
  const visibleMessages = messages.length === 0 ? [defaultAssistantMessage] : messages;
  const visibleSuggestions = messages.length === 0 ? defaultSuggestions : suggestions;

  const handleSend = useCallback(
    async (rawMessage: string) => {
      const trimmedMessage = rawMessage.trim();

      if (!trimmedMessage || loading) {
        return;
      }

      const historyBaseMessages = activeSession?.messages ?? [];
      const userMessage = createHistoryMessage('user', trimmedMessage);
      const optimisticSessionId = currentSessionId ?? `local-${Date.now()}`;

      setLoading(true);
      setError(null);
      setCurrentSessionId('chat', optimisticSessionId);
      upsertSession({
        category: 'chat',
        id: optimisticSessionId,
        messages: [...historyBaseMessages, userMessage],
        ...(activeSession?.serverSessionId
          ? { serverSessionId: activeSession.serverSessionId }
          : {}),
        title: activeSession?.title ?? '新对话',
        updatedAt: Date.now(),
      });

      try {
        const result = await client.ai.chat.send.mutate({
          category: 'chat',
          ...(activeSession?.serverSessionId ? { sessionId: activeSession.serverSessionId } : {}),
          message: trimmedMessage,
        });
        const assistantResponse = collectAssistantResponse(result.events);

        if (assistantResponse.errorMessage) {
          setError(assistantResponse.errorMessage);
          upsertSession({
            category: 'chat',
            id: optimisticSessionId,
            messages: [...historyBaseMessages, userMessage],
            serverSessionId: result.sessionId,
            title: activeSession?.title ?? '新对话',
            updatedAt: Date.now(),
          });
          return;
        }

        const nextMessages = [...historyBaseMessages, userMessage];

        if (assistantResponse.content.trim()) {
          nextMessages.push(
            createHistoryMessage(
              'assistant',
              assistantResponse.content,
              assistantResponse.suggestions
            )
          );
        }

        upsertSession({
          category: 'chat',
          id: optimisticSessionId,
          messages: nextMessages,
          serverSessionId: result.sessionId,
          title: activeSession?.title ?? '新对话',
          updatedAt: Date.now(),
        });

        if (assistantResponse.redirectTo) {
          router.push(assistantResponse.redirectTo);
        }
      } catch (mutationError) {
        setError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [activeSession, client, currentSessionId, loading, router, setCurrentSessionId, upsertSession]
  );

  return (
    <div className="mx-auto flex h-full min-h-[calc(100vh-112px)] max-w-[1400px] gap-4 bg-white pb-4 md:pb-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <ChatMessageList
            loading={loading}
            loadingIndicator={<AdLoadingBot />}
            messages={visibleMessages}
            onSuggestionSelect={handleSend}
            suggestions={visibleSuggestions}
            suggestionsDisabled={loading}
          />
          {error ? (
            <div
              aria-live="assertive"
              className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <AiSender loading={loading} onSend={handleSend} />
        </div>
      </div>
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

function createHistoryMessage(
  role: Message['role'],
  content: string,
  suggestions?: string[]
): Message {
  return {
    content,
    id: createMessageId(role),
    role,
    ...(suggestions?.length ? { suggestions } : {}),
    timestamp: new Date().toISOString(),
  };
}

function createMessageId(role: Message['role']) {
  const random = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.();

  if (random) {
    return `${role}-${random}`;
  }

  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
