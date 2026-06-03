'use client';

import type { AuthUserSummary } from '@package/shared';
import { BookOpen, Heart, LogIn, LogOut, MessageSquare, PenTool } from 'lucide-react';
import Link from 'next/link';

import { useUserPreferences } from '../../contexts/user-preferences-context';

export type ShellMainTab = 'chat' | 'lesson' | 'office';

type AppSidebarProps = {
  activeTab: ShellMainTab;
  onDonateClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  user: AuthUserSummary | null;
};

const navItems = [
  { id: 'chat', label: 'AI 助手', href: '/chat', icon: MessageSquare },
  { id: 'lesson', label: '知识库精讲', href: '/lesson/inspiration', icon: BookOpen },
  { id: 'office', label: '办公提效', href: '/office/comment', icon: PenTool },
] as const;

export function AppSidebar({
  activeTab,
  onDonateClick,
  onLoginClick,
  onLogoutClick,
  user,
}: AppSidebarProps) {
  const { credits } = useUserPreferences();

  return (
    <aside
      aria-label="应用导航"
      className="relative z-30 flex h-full w-[80px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div className="flex shrink-0 items-center justify-center p-4">
        <Link
          aria-label="红笔AI 首页"
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-orange-400 shadow-lg shadow-red-200/50 transition-all hover:scale-105 active:scale-95"
          href="/chat"
          prefetch={false}
        >
          <PenTool className="h-6 w-6 text-white" />
        </Link>
      </div>

      <nav className="mt-6 flex flex-1 flex-col items-center space-y-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div className="group relative flex w-full justify-center px-4" key={item.id}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex aspect-square w-full items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100/50'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
                href={item.href}
                prefetch={false}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-red-600' : ''}`} />
              </Link>
              <div className="invisible absolute top-1/2 left-[70px] z-50 -translate-y-1/2 rounded-xl bg-slate-800 px-3 py-2 text-[13px] font-medium whitespace-nowrap text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                {item.label}
                <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-slate-800" />
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-4 border-t border-slate-100 p-4 pb-6">
        <div className="group relative flex w-full justify-center">
          <button
            aria-label="赞助支持"
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
            onClick={onDonateClick}
            type="button"
          >
            <Heart className="h-5 w-5" />
          </button>
          <div className="invisible absolute top-1/2 left-[70px] z-50 -translate-y-1/2 rounded-xl bg-slate-800 px-3 py-2 text-[13px] font-medium whitespace-nowrap text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
            赞助支持
            <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-slate-800" />
          </div>
        </div>

        {user ? (
          <div className="group relative flex w-full justify-center">
            <div className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[15px] font-bold text-slate-600 shadow-sm ring-2 ring-white">
              {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="invisible absolute bottom-0 left-[70px] z-50 min-w-[180px] origin-bottom-left rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
              <div className="mb-1 border-b border-slate-100 px-3 py-2">
                <div className="truncate text-sm font-bold">{user.name ?? '微信用户'}</div>
                <div className="mb-2 truncate text-xs text-slate-400">{user.email}</div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                      剩余次数
                    </span>
                    <span className="text-xs font-black text-emerald-700">180天周期</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black text-emerald-600">{credits}</span>
                    <span className="text-[10px] font-bold text-emerald-400">/ 40</span>
                  </div>
                </div>
              </div>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                onClick={onLogoutClick}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
              <div className="absolute bottom-5 left-[-5px] h-2.5 w-2.5 rotate-45 border-b border-l border-slate-200 bg-white" />
            </div>
          </div>
        ) : (
          <div className="group relative flex w-full justify-center">
            <button
              aria-label="登录账户"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
              onClick={onLoginClick}
              type="button"
            >
              <LogIn className="h-5 w-5" />
            </button>
            <div className="invisible absolute top-1/2 left-[70px] z-50 -translate-y-1/2 rounded-xl bg-slate-800 px-3 py-2 text-[13px] font-medium whitespace-nowrap text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
              登录账户
              <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-slate-800" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
