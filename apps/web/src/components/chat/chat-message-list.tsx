'use client';

import { AiMessageBubble, type ChatMessage } from './ai-message-bubble';

type ChatMessageListProps = {
  messages: ChatMessage[];
  loading: boolean;
};

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  return (
    <section aria-label="消息列表" className="web-chat__messages" role="log">
      {messages.length === 0 ? (
        <div className="web-chat__empty">
          <h2>开始一段对话</h2>
          <p>输入你想解决的问题，AetherCore 会在当前会话中继续上下文。</p>
        </div>
      ) : (
        messages.map((message) => <AiMessageBubble key={message.id} message={message} />)
      )}

      {loading ? (
        <div aria-live="polite" className="web-chat__loading">
          正在生成回复...
        </div>
      ) : null}
    </section>
  );
}
