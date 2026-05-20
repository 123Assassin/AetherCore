'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, useState } from 'react';

type AdminNavItem = {
  href: string;
  label: string;
};

type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

const navGroups: AdminNavGroup[] = [
  {
    id: 'workspace',
    label: '工作台',
    items: [{ href: '/dashboard', label: '数据看板' }],
  },
  {
    id: 'administration',
    label: '用户与系统',
    items: [
      { href: '/users', label: '用户管理' },
      { href: '/settings', label: '系统设置' },
    ],
  },
  {
    id: 'resources',
    label: '内容与资源',
    items: [
      { href: '/resources/agents', label: '智能体管理' },
      { href: '/resources/prompts', label: 'AI Prompt' },
      { href: '/resources/sensitive-words', label: '敏感词库' },
    ],
  },
  {
    id: 'operations',
    label: '案例与监控',
    items: [
      { href: '/operations/activities', label: '活动与通告' },
      { href: '/operations/fission', label: '裂变管理' },
      { href: '/engine-dispatch', label: '模型引擎调度' },
      { href: '/simulations', label: '仿真案例库' },
    ],
  },
  {
    id: 'security',
    label: '安全与告警',
    items: [
      { href: '/security/system-audit', label: '系统审计日志' },
      { href: '/security/content-audit', label: 'AI 内容审计' },
      { href: '/security/traffic-monitor', label: '流量监控' },
      { href: '/alarm', label: '消息告警中心' },
    ],
  },
];

type AdminSidebarProps = {
  compact?: boolean;
};

export function AdminSidebar({ compact = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);

  function toggleGroup(groupId: string) {
    setCollapsedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  }

  return (
    <aside aria-label="管理员导航" style={compact ? styles.compactSidebar : styles.sidebar}>
      <div style={compact ? styles.compactBrandBlock : styles.brandBlock}>
        <strong style={styles.brand}>AetherCore</strong>
        <span style={styles.brandMeta}>Admin Console</span>
      </div>

      <nav aria-label="后台功能" style={compact ? styles.compactNav : styles.nav}>
        {navGroups.map((group) => {
          const collapsed = collapsedGroupIds.includes(group.id);
          const panelId = `admin-nav-${group.id}`;

          return (
            <section key={group.id} style={styles.group}>
              <button
                aria-controls={panelId}
                aria-expanded={!collapsed}
                onClick={() => toggleGroup(group.id)}
                style={styles.groupButton}
                type="button"
              >
                <span style={styles.groupLabel}>{group.label}</span>
                <span aria-hidden="true" style={styles.groupIcon}>
                  {collapsed ? '+' : '-'}
                </span>
              </button>

              {!collapsed ? (
                <div id={panelId} style={styles.itemList}>
                  {group.items.map((item) => {
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        aria-current={active ? 'page' : undefined}
                        href={item.href}
                        key={item.href}
                        style={active ? styles.activeItem : styles.item}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const styles = {
  activeItem: {
    background: '#e6f4f1',
    border: '1px solid #99d6cc',
    borderRadius: 6,
    color: '#0f766e',
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '20px',
    overflow: 'hidden',
    padding: '8px 10px',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  brand: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: '24px',
  },
  brandBlock: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
    display: 'grid',
    gap: 2,
    padding: '18px 16px 16px',
  },
  brandMeta: {
    color: '#a8b7c7',
    fontSize: 12,
    lineHeight: '16px',
  },
  compactBrandBlock: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
    display: 'grid',
    gap: 2,
    padding: '12px 14px',
  },
  compactNav: {
    display: 'grid',
    gap: 12,
    padding: 12,
  },
  compactSidebar: {
    background: '#111827',
    borderBottom: '1px solid #0f172a',
    minHeight: 0,
    minWidth: 0,
  },
  group: {
    display: 'grid',
    gap: 8,
  },
  groupButton: {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    color: '#cbd5e1',
    cursor: 'pointer',
    display: 'flex',
    fontSize: 13,
    fontWeight: 700,
    justifyContent: 'space-between',
    lineHeight: '18px',
    padding: '4px 2px',
    textAlign: 'left',
    width: '100%',
  },
  groupIcon: {
    color: '#94a3b8',
    flex: '0 0 auto',
    fontSize: 16,
    lineHeight: '18px',
  },
  groupLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  item: {
    border: '1px solid transparent',
    borderRadius: 6,
    color: '#dbe5ef',
    display: 'block',
    fontSize: 14,
    lineHeight: '20px',
    overflow: 'hidden',
    padding: '8px 10px',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemList: {
    display: 'grid',
    gap: 4,
  },
  nav: {
    display: 'grid',
    gap: 18,
    padding: 14,
  },
  sidebar: {
    background: '#111827',
    borderRight: '1px solid #0f172a',
    minHeight: '100vh',
  },
} satisfies Record<string, CSSProperties>;
