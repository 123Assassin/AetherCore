'use client';

import type { AuthUserSummary } from '@package/shared';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

type AdminHeaderProps = {
  compact?: boolean;
  user: AuthUserSummary;
};

const routeTitles = [
  { href: '/dashboard', title: '数据看板', section: 'Dashboard' },
  { href: '/resources/agents', title: '智能体管理', section: 'Resources' },
  { href: '/resources/prompts', title: 'AI Prompt 管理', section: 'Resources' },
  { href: '/resources/sensitive-words', title: '敏感词库管理', section: 'Resources' },
  { href: '/engine-dispatch', title: '模型引擎调度', section: 'Engine' },
  { href: '/simulations', title: '仿真案例库管理', section: 'Simulations' },
  { href: '/users', title: '用户管理', section: 'Users' },
  { href: '/settings', title: '系统设置', section: 'Settings' },
];

export function AdminHeader({ compact = false, user }: AdminHeaderProps) {
  const pathname = usePathname();
  const title = getRouteTitle(pathname);
  const displayName = user.name || user.email;

  return (
    <header style={compact ? styles.compactHeader : styles.header}>
      <div style={styles.titleBlock}>
        <p style={styles.section}>{title.section}</p>
        <h1 style={compact ? styles.compactTitle : styles.title}>{title.title}</h1>
      </div>
      <div aria-label="管理员会话" style={compact ? styles.compactAccount : styles.account}>
        <span style={compact ? styles.compactAccountName : styles.accountName}>{displayName}</span>
        <span style={compact ? styles.compactAccountEmail : styles.accountEmail}>{user.email}</span>
      </div>
    </header>
  );
}

function getRouteTitle(pathname: string): { title: string; section: string } {
  return (
    routeTitles.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? {
      section: 'Admin',
      title: '后台管理',
    }
  );
}

const styles = {
  account: {
    alignItems: 'end',
    display: 'grid',
    gap: 2,
    minWidth: 0,
    textAlign: 'right',
  },
  accountEmail: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  accountName: {
    color: '#172033',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '20px',
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compactAccount: {
    alignItems: 'start',
    display: 'grid',
    gap: 2,
    minWidth: 0,
    textAlign: 'left',
    width: '100%',
  },
  compactAccountEmail: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compactAccountName: {
    color: '#172033',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '20px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compactHeader: {
    alignItems: 'start',
    background: '#ffffff',
    borderBottom: '1px solid #d8dee8',
    display: 'grid',
    gap: 8,
    minHeight: 0,
    minWidth: 0,
    padding: '12px 14px',
  },
  compactTitle: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
  header: {
    alignItems: 'center',
    background: '#ffffff',
    borderBottom: '1px solid #d8dee8',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
    minHeight: 68,
    padding: '12px 24px',
  },
  section: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: 0,
  },
  title: {
    color: '#172033',
    fontSize: 20,
    lineHeight: '28px',
    margin: 0,
  },
  titleBlock: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
} satisfies Record<string, CSSProperties>;
