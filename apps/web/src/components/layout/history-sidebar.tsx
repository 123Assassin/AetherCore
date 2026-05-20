'use client';

import { BookOpen, Box, Lightbulb, MessageSquare, PenTool, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  type ChatSession,
  type ChatSessionCategory,
  useChatHistory,
} from '../../contexts/chat-history-context';
import type { ShellCategory } from './app-header';
import type { ShellMainTab } from './app-sidebar';

type HistorySidebarProps = {
  activeCategory: ShellCategory;
  activeTab: ShellMainTab;
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: ChatSession | null) => void;
};

const tabNames: Record<ShellMainTab, string> = {
  chat: 'AI 助手',
  lesson: '备课精讲',
  office: '办公提效',
};

const categoryRoutes: Record<ChatSessionCategory, string> = {
  chat: '/chat',
  comment: '/office/comment',
  inspiration: '/lesson/inspiration',
  simulation: '/lesson/simulation',
  teaching: '/office/teaching',
};

function sessionBelongsToTab(session: ChatSession, activeTab: ShellMainTab) {
  if (activeTab === 'lesson') {
    return session.category === 'inspiration' || session.category === 'simulation';
  }

  if (activeTab === 'office') {
    return session.category === 'comment' || session.category === 'teaching';
  }

  return session.category === 'chat';
}

function HistoryCategoryIcon({
  active,
  category,
}: {
  active: boolean;
  category: ChatSessionCategory;
}) {
  if (category === 'inspiration') {
    return <Lightbulb className="h-3.5 w-3.5 text-orange-400" />;
  }

  if (category === 'simulation') {
    return <Box className="h-3.5 w-3.5 text-blue-400" />;
  }

  if (category === 'comment') {
    return <PenTool className="h-3.5 w-3.5 text-green-400" />;
  }

  if (category === 'teaching') {
    return <BookOpen className="h-3.5 w-3.5 text-purple-400" />;
  }

  return <MessageSquare className={`h-4 w-4 ${active ? 'text-red-500' : 'text-gray-400'}`} />;
}

export function HistorySidebar({
  activeCategory,
  activeTab,
  currentSessionId,
  isOpen,
  onClose,
  onSelectSession,
}: HistorySidebarProps) {
  const { deleteSession, sessions } = useChatHistory();
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  const filteredSessions = sessions.filter((session) => sessionBelongsToTab(session, activeTab));

  function handleSelectSession(session: ChatSession) {
    onSelectSession(session);
    router.push(categoryRoutes[session.category]);
  }

  return (
    <aside className="animate-in slide-in-from-left-4 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-all duration-300">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="flex items-center gap-2 font-bold text-gray-800">
          <MessageSquare className="h-4 w-4 text-red-500" />
          {tabNames[activeTab]}
        </h2>
        <button
          aria-label="关闭历史记录"
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-100"
          onClick={() => onSelectSession(null)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          新建对话
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
        {filteredSessions.map((session) => {
          const active = currentSessionId === session.id || activeCategory === session.category;

          return (
            <div
              className={`group flex w-full items-center justify-between rounded-xl transition-all ${
                currentSessionId === session.id
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              key={session.id}
            >
              <button
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-3 text-left"
                onClick={() => handleSelectSession(session)}
                type="button"
              >
                <span className="shrink-0">
                  <HistoryCategoryIcon active={active} category={session.category} />
                </span>
                <span className="truncate text-sm font-medium">{session.title || '新对话'}</span>
              </button>
              <button
                aria-label="删除历史记录"
                className="mr-3 rounded p-1 text-gray-400 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-500"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSession(session.id);
                }}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {filteredSessions.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            <div className="mb-2 flex justify-center">
              <MessageSquare className="h-8 w-8 opacity-20" />
            </div>
            暂无该模块的历史记录
          </div>
        ) : null}
      </div>
    </aside>
  );
}
