'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { AiMessageBubble, type ChatMessage } from './ai-message-bubble';
import { SuggestionChips } from './suggestion-chips';

type ChatMessageListProps = {
  loadingIndicator?: ReactNode;
  loading: boolean;
  messages: ChatMessage[];
  onSuggestionSelect: (suggestion: string) => void;
  suggestions: string[];
  suggestionsDisabled: boolean;
};

type ScrollContainer = {
  scrollHeight: number;
  scrollTop: number;
};

export function ChatMessageList({
  loading,
  loadingIndicator,
  messages,
  onSuggestionSelect,
  suggestions,
  suggestionsDisabled,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const lastMessage = messages.at(-1);
  const shouldRenderSuggestions =
    !loading && suggestions.length > 0 && lastMessage?.role === 'assistant';

  useEffect(() => {
    const scrollContainer = scrollRef.current as unknown as ScrollContainer | null;

    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [lastMessage?.content, lastMessage?.id, loading]);

  return (
    <section
      aria-label="消息列表"
      className="flex-1 space-y-6 overflow-y-auto bg-slate-50/30 p-4 md:p-6"
      ref={scrollRef}
      role="log"
    >
      {messages.map((message) => (
        <div key={message.id}>
          <AiMessageBubble message={message} />
          {shouldRenderSuggestions && message.id === lastMessage?.id ? (
            <div className="ml-12 max-w-[85%]">
              <SuggestionChips
                disabled={suggestionsDisabled}
                onSelect={onSuggestionSelect}
                suggestions={suggestions}
              />
            </div>
          ) : null}
        </div>
      ))}

      {loading ? <div aria-live="polite">{loadingIndicator}</div> : null}
    </section>
  );
}
