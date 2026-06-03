import type { AiConversationCategory } from './agent-mapping.js';

export type { AiConversationCategory } from './agent-mapping.js';

export type AiMessageRole = 'user' | 'assistant' | 'system';

export type AiWorkflowName = 'comment' | 'inspiration' | 'teaching';

export type AiStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'delta'; content: string }
  | { type: 'suggestions'; suggestions: string[] }
  | { type: 'workflow'; workflowName: AiWorkflowName; redirectTo: string }
  | { type: 'credit'; remaining: number }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };

export type AiChatCreateInput = {
  category?: AiConversationCategory;
  title?: string;
  metadata?: Record<string, unknown> | null;
};

export type AiChatCreateResult = {
  sessionId: string;
  category: AiConversationCategory;
  title: string;
  createdAt: string;
};

export type AiChatSendInput = {
  sessionId?: string;
  category?: AiConversationCategory;
  message: string;
  payload?: Record<string, unknown> | unknown[] | null;
};

export type AiChatSendResult = {
  sessionId: string;
  events: AiStreamEvent[];
};

export type AiHistoryListInput = {
  category?: AiConversationCategory;
  limit?: number;
};

export type AiHistoryItem = {
  sessionId: string;
  category: AiConversationCategory;
  title: string;
  messages: AiHistoryMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AiHistoryMessage = {
  id: string;
  role: AiMessageRole;
  content: string;
  suggestions: string[];
  workflowName: AiWorkflowName | null;
  redirectTo: string | null;
  createdAt: string;
};

export type AiHistoryListResult = {
  items: AiHistoryItem[];
};

export type AiHistoryDeleteInput = {
  sessionId: string;
};

export type AiHistoryDeleteResult = {
  success: true;
};
