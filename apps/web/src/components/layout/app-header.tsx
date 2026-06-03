'use client';

import { PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { ShellMainTab } from './app-sidebar';

export type ShellCategory = 'chat' | 'inspiration' | 'simulation' | 'comment' | 'teaching';

type AppHeaderProps = {
  activeTab: ShellMainTab;
  historyOpen: boolean;
  onToggleHistory: () => void;
};

const lessonSubNavItems = [
  { id: 'inspiration', label: '知识精讲', href: '/lesson/inspiration' },
  { id: 'simulation', label: '互动实验', href: '/lesson/simulation' },
] as const;

const officeSubNavItems = [
  { id: 'comment', label: '评语助手', href: '/office/comment' },
  { id: 'teaching', label: '题目变身', href: '/office/teaching' },
] as const;

export function useShellRoute() {
  const pathname = usePathname();

  return getShellRouteFromPath(pathname);
}

export function getShellRouteFromPath(pathname: string): {
  activeCategory: ShellCategory;
  activeTab: ShellMainTab;
  pathname: string;
} {
  if (pathname === '/lesson/simulation' || pathname.startsWith('/lesson/simulation/')) {
    return { activeCategory: 'simulation', activeTab: 'lesson', pathname };
  }

  if (pathname === '/lesson/inspiration' || pathname.startsWith('/lesson/inspiration/')) {
    return { activeCategory: 'inspiration', activeTab: 'lesson', pathname };
  }

  if (pathname === '/office/teaching' || pathname.startsWith('/office/teaching/')) {
    return { activeCategory: 'teaching', activeTab: 'office', pathname };
  }

  if (pathname === '/office/comment' || pathname.startsWith('/office/comment/')) {
    return { activeCategory: 'comment', activeTab: 'office', pathname };
  }

  return { activeCategory: 'chat', activeTab: 'chat', pathname };
}

export function AppHeader({ activeTab, historyOpen, onToggleHistory }: AppHeaderProps) {
  const { activeCategory } = useShellRoute();
  const subNavItems =
    activeTab === 'lesson' ? lessonSubNavItems : activeTab === 'office' ? officeSubNavItems : [];

  return (
    <header className="sticky top-0 z-20 flex h-[64px] flex-none items-center justify-between border-b border-slate-100 bg-white px-6">
      <div className="flex min-w-0 flex-1 items-center gap-8">
        <div className="flex items-center gap-4">
          <button
            aria-label="切换历史记录"
            className={`rounded-xl p-2 transition-all ${
              historyOpen
                ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100/50'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95'
            }`}
            onClick={onToggleHistory}
            title="切换历史记录"
            type="button"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-[17px] leading-none font-black tracking-tight text-slate-800">
              红笔<span className="text-red-500 italic">AI</span>
            </h1>
            <span className="mt-1 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
              你的AI教学搭档
            </span>
          </div>
        </div>

        {subNavItems.length > 0 ? (
          <>
            <div className="h-6 w-px bg-slate-100" />
            <nav
              aria-label={activeTab === 'lesson' ? '课程导航' : '办公导航'}
              className="flex items-center rounded-[14px] bg-slate-50 p-1 ring-1 ring-slate-100"
            >
              {subNavItems.map((item) => {
                const isActive = activeCategory === item.id;

                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-xl px-6 py-1.5 text-xs font-black transition-all ${
                      isActive
                        ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    href={item.href}
                    key={item.id}
                    prefetch={false}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        ) : null}
      </div>
    </header>
  );
}
