'use client';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AiMessageBubbleProps = {
  message: ChatMessage;
};

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <article
      aria-label={isUser ? '用户消息' : '助手消息'}
      className={isUser ? 'ai-message ai-message--user' : 'ai-message ai-message--assistant'}
    >
      <div className="ai-message__meta">{isUser ? '你' : 'AetherCore'}</div>
      <div className="ai-message__content">{message.content}</div>
    </article>
  );
}
