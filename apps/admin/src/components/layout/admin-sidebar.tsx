'use client';

import {
  Activity,
  Bell,
  BellRing,
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  FileSearch,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  LogOut,
  type LucideIcon,
  ServerCog,
  Settings as SettingsIcon,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldUser,
  TerminalSquare,
  Users as UsersIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

type NavChild = {
  icon: LucideIcon;
  name: string;
  path: string;
};

type NavItem =
  | {
      children: NavChild[];
      icon: LucideIcon;
      name: string;
      path?: never;
    }
  | {
      children?: never;
      icon: LucideIcon;
      name: string;
      path: string;
    };

const navItems: NavItem[] = [
  { name: '数据看板', path: '/dashboard', icon: LayoutDashboard },
  {
    name: '内容与资源管理',
    icon: FolderOpen,
    children: [
      { name: '智能体管理', path: '/resources/agents', icon: Bot },
      { name: 'AI Prompt管理', path: '/resources/prompts', icon: TerminalSquare },
      { name: '敏感词库管理', path: '/resources/sensitive-words', icon: ShieldAlert },
    ],
  },
  { name: '仿真案例库管理', path: '/simulations', icon: Database },
  { name: '引擎调度中心', path: '/engine-dispatch', icon: ServerCog },
  { name: '用户管理', path: '/users', icon: UsersIcon },
  {
    name: '运营配置',
    icon: Activity,
    children: [
      { name: '活动管理', path: '/operations/activities', icon: Bell },
      { name: '裂变管理', path: '/operations/fission', icon: Share2 },
    ],
  },
  {
    name: '安全与系统监控',
    icon: Shield,
    children: [
      { name: '系统审计日志', path: '/security/system-audit', icon: FileText },
      { name: 'AI内容审计', path: '/security/content-audit', icon: FileSearch },
      { name: '流量监控', path: '/security/traffic-monitor', icon: LineChart },
    ],
  },
  { name: '消息告警中心', path: '/alarm', icon: BellRing },
  { name: '系统管理员', path: '/system-admins', icon: ShieldUser },
  { name: '系统设置', path: '/settings', icon: SettingsIcon },
];

const defaultExpandedGroups = ['内容与资源管理', '运营配置', '安全与系统监控'];

export function AdminSidebar() {
  const client = useTrpcClient();
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(defaultExpandedGroups);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function toggleGroup(name: string) {
    setExpandedGroups((current) =>
      current.includes(name) ? current.filter((group) => group !== name) : [...current, name]
    );
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setLogoutError(null);

    try {
      await client.adminAuth.logout.mutate();
      router.replace('/login');
    } catch {
      setLogoutError('退出登录失败，请稍后重试。');
      setLoggingOut(false);
    }
  }

  return (
    <aside className="bg-sidebar-dark custom-scrollbar sticky top-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-800 shadow-2xl">
      <div className="flex items-center gap-3 p-8 pb-10">
        <div className="bg-primary ring-primary/20 flex h-9 w-9 items-center justify-center rounded-xl text-white ring-4">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-lg leading-none font-bold tracking-tight text-white">
            Nexus 管理后台
          </h1>
          <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            管理中心
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4" aria-label="后台功能">
        {navItems.map((item) => {
          if (item.children) {
            const isExpanded = expandedGroups.includes(item.name);
            const isChildActive = item.children.some((child) =>
              isActiveRoute(pathname, child.path)
            );
            const GroupIcon = item.icon;

            return (
              <div className="space-y-1" key={item.name}>
                <button
                  aria-expanded={isExpanded}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300',
                    isChildActive && !isExpanded
                      ? 'text-primary'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                  onClick={() => toggleGroup(item.name)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <GroupIcon
                      className={cn(
                        isChildActive && !isExpanded
                          ? 'text-primary'
                          : 'text-slate-500 group-hover:text-slate-300'
                      )}
                      size={20}
                    />
                    {item.name}
                  </span>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      animate={{ opacity: 1, height: 'auto' }}
                      className="overflow-hidden"
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                    >
                      <div className="space-y-1 py-2 pr-2 pl-11">
                        {item.children.map((child) => {
                          const isActive = isActiveRoute(pathname, child.path);
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-300',
                                isActive
                                  ? 'bg-primary shadow-primary/20 font-bold text-white shadow-md'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              )}
                              href={child.path}
                              key={child.path}
                            >
                              <ChildIcon size={16} />
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = isActiveRoute(pathname, item.path);
          const ItemIcon = item.icon;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300',
                isActive
                  ? 'bg-primary shadow-primary/20 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              href={item.path}
              key={item.path}
            >
              <ItemIcon
                className={cn(
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                )}
                size={20}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 p-6">
        <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
              AD
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-bold text-white">系统管理员</p>
              <p className="truncate text-[10px] text-slate-500">超级管理员</p>
            </div>
            <button
              aria-label="退出登录"
              className="text-slate-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loggingOut}
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={16} />
            </button>
          </div>
          {logoutError ? (
            <p aria-live="polite" className="text-[10px] font-bold text-red-400" role="alert">
              {logoutError}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function cn(...classes: Array<false | null | string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
