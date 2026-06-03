'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import type { ChatMessage } from '../../../components/chat/ai-message-bubble';
import { AiSender } from '../../../components/chat/ai-sender';
import { ChatMessageList } from '../../../components/chat/chat-message-list';
import { GenerationAdOverlay } from '../../../components/sponsor/ad-system';
import { type Message, useChatHistory } from '../../../contexts/chat-history-context';
import { useWebAuth } from '../../../contexts/web-auth-context';
import { useAiGenerationAdGate } from '../../../hooks/use-ai-generation-ad-gate';
import { sendAiChatStream } from '../../../lib/ai-chat-stream';
import { getLoginRequiredMessage, isUserSessionRequiredError } from '../../../lib/auth-gate';
import {
  type ChatWorkflowRoute,
  createChatWorkflowIntentAction,
  createChatWorkflowIntentReply,
  isChatWorkflowRoute,
  resolveChatWorkflowIntent,
} from '../../../lib/chat-workflow-intent';

function getMutationErrorMessage(error: unknown) {
  if (isUserSessionRequiredError(error)) {
    return getLoginRequiredMessage('chat');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '消息发送失败，请稍后重试。';
}

const defaultAssistantMessage: ChatMessage = {
  content:
    '老师您好！我是红笔AI，您的专属教学AI助手。您可以直接和我聊天，或者告诉我您的需求（比如：“帮我写个评语”、“我想备课”），我会为您打开对应的专业工具。',
  id: 'chat-default-assistant-message',
  role: 'assistant',
};

const defaultSuggestions = ['帮我写一份期末评语', '我想找点备课灵感', '如何处理课堂上的突发情况？'];

export default function ChatPage() {
  const router = useRouter();
  const { authChecked, requestLogin, user } = useWebAuth();
  const { currentSessionIds, sessions, setCurrentSessionId, upsertSession } = useChatHistory();
  const { adMode, adOpen, closeAdGate, runWithAdGate } = useAiGenerationAdGate();
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
          ...(message.action ? { action: message.action } : {}),
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

      if (!authChecked) {
        setError('正在确认登录状态，请稍后再试。');
        return;
      }

      if (!user) {
        const loginRequiredMessage = getLoginRequiredMessage('chat');

        setError(loginRequiredMessage);
        requestLogin(loginRequiredMessage);
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

      const localWorkflowRoute = resolveChatWorkflowIntent(trimmedMessage);

      if (localWorkflowRoute) {
        const assistantMessage = createHistoryMessage(
          'assistant',
          createChatWorkflowIntentReply(localWorkflowRoute),
          {
            action: createChatWorkflowIntentAction(localWorkflowRoute),
          }
        );

        upsertSession({
          category: 'chat',
          id: optimisticSessionId,
          messages: [...historyBaseMessages, userMessage, assistantMessage],
          ...(activeSession?.serverSessionId
            ? { serverSessionId: activeSession.serverSessionId }
            : {}),
          title: activeSession?.title ?? '新对话',
          updatedAt: Date.now(),
        });
        setLoading(false);
        return;
      }

      runWithAdGate(async () => {
        try {
          const assistantMessage = createHistoryMessage('assistant', '');
          let redirectTo: ChatWorkflowRoute | null = null;
          let serverSessionId = activeSession?.serverSessionId ?? null;
          let streamedContent = '';
          let streamedSuggestions: string[] = [];

          const buildMessages = (): Message[] => [
            ...historyBaseMessages,
            userMessage,
            {
              ...assistantMessage,
              ...(streamedSuggestions.length ? { suggestions: streamedSuggestions } : {}),
              content: streamedContent,
            },
          ];
          const syncStreamSession = (messages: Message[]) => {
            upsertSession({
              category: 'chat',
              id: optimisticSessionId,
              messages,
              ...(serverSessionId ? { serverSessionId } : {}),
              title: activeSession?.title ?? '新对话',
              updatedAt: Date.now(),
            });
          };
          const streamResult = await sendAiChatStream(
            {
              category: 'chat',
              ...(activeSession?.serverSessionId
                ? { sessionId: activeSession.serverSessionId }
                : {}),
              message: trimmedMessage,
            },
            {
              onEvent(event) {
                if (event.type === 'delta') {
                  streamedContent += event.content;
                  syncStreamSession(buildMessages());
                }

                if (event.type === 'session') {
                  serverSessionId = event.sessionId;
                  syncStreamSession(
                    streamedContent ? buildMessages() : [...historyBaseMessages, userMessage]
                  );
                }

                if (event.type === 'suggestions') {
                  streamedSuggestions = event.suggestions;
                  syncStreamSession(
                    streamedContent ? buildMessages() : [...historyBaseMessages, userMessage]
                  );
                }

                if (event.type === 'workflow') {
                  redirectTo = getChatWorkflowRoute(event.redirectTo);
                }
              },
            }
          );

          serverSessionId = streamResult.sessionId;
          syncStreamSession(
            streamedContent ? buildMessages() : [...historyBaseMessages, userMessage]
          );

          if (redirectTo) {
            router.push(redirectTo);
          }
        } catch (mutationError) {
          const errorMessage = getMutationErrorMessage(mutationError);

          setError(errorMessage);

          if (isUserSessionRequiredError(mutationError)) {
            requestLogin(errorMessage);
          }
        } finally {
          setLoading(false);
        }
      });
    },
    [
      activeSession,
      authChecked,
      currentSessionId,
      loading,
      requestLogin,
      router,
      runWithAdGate,
      setCurrentSessionId,
      upsertSession,
      user,
    ]
  );

  return (
    <div className="mx-auto flex h-full min-h-[calc(100vh-112px)] max-w-[1400px] gap-4 bg-white pb-4 md:pb-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <ChatMessageList
            loading={loading}
            loadingIndicator={
              <div className="ml-12 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                AI 正在生成...
              </div>
            }
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
      <GenerationAdOverlay isOpen={adOpen} mode={adMode} onClose={closeAdGate} />
    </div>
  );
}

function getChatWorkflowRoute(redirectTo: string): ChatWorkflowRoute | null {
  return isChatWorkflowRoute(redirectTo) ? redirectTo : null;
}

function createHistoryMessage(
  role: Message['role'],
  content: string,
  options?: {
    action?: Message['action'];
    suggestions?: string[];
  }
): Message {
  return {
    content,
    id: createMessageId(role),
    role,
    ...(options?.action ? { action: options.action } : {}),
    ...(options?.suggestions?.length ? { suggestions: options.suggestions } : {}),
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
