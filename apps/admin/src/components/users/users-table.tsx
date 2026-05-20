import type { AdminMutableUserStatus, AdminUserItem } from '@package/shared';
import type { CSSProperties } from 'react';

import { QuotaBadge } from './quota-badge';

type UsersTableProps = {
  deletingIds: ReadonlySet<string>;
  items: AdminUserItem[];
  onBlacklistChange: (item: AdminUserItem, isBlacklisted: boolean) => void;
  onDelete: (item: AdminUserItem) => void;
  onStatusChange: (item: AdminUserItem, status: AdminMutableUserStatus) => void;
  updatingBlacklistIds: ReadonlySet<string>;
  updatingStatusIds: ReadonlySet<string>;
};

export function UsersTable({
  deletingIds,
  items,
  onBlacklistChange,
  onDelete,
  onStatusChange,
  updatingBlacklistIds,
  updatingStatusIds,
}: UsersTableProps) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>用户</th>
            <th style={styles.headerCell}>角色</th>
            <th style={styles.headerCell}>配额</th>
            <th style={styles.headerCell}>状态</th>
            <th style={styles.headerCell}>黑名单</th>
            <th style={styles.headerCell}>最近登录</th>
            <th style={styles.headerCell}>创建时间</th>
            <th style={styles.actionHeaderCell}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const deleted = item.status === 'deleted';
            const statusBusy = updatingStatusIds.has(item.id);
            const blacklistBusy = updatingBlacklistIds.has(item.id);
            const deleting = deletingIds.has(item.id);
            const rowBusy = statusBusy || blacklistBusy || deleting;
            const nextStatus = getNextStatus(item.status);

            return (
              <tr key={item.id}>
                <td style={styles.bodyCell}>
                  <div style={styles.nameGroup}>
                    <strong style={styles.name}>{item.displayName}</strong>
                    <span style={styles.email}>{item.email}</span>
                    <span style={styles.idText}>{item.id}</span>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.roleBadge}>{item.role}</span>
                </td>
                <td style={styles.bodyCell}>
                  <QuotaBadge credits={item.credits} totalQuota={item.totalQuota} />
                </td>
                <td style={styles.bodyCell}>
                  <div style={styles.controlGroup}>
                    <span style={getStatusBadgeStyle(item.status)}>
                      {statusLabels[item.status]}
                    </span>
                    <button
                      disabled={deleted || rowBusy}
                      onClick={() => onStatusChange(item, nextStatus)}
                      style={styles.secondaryButton}
                      type="button"
                    >
                      {statusBusy ? '更新中...' : statusActionLabels[nextStatus]}
                    </button>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <div style={styles.controlGroup}>
                    <span style={item.isBlacklisted ? styles.blacklistBadge : styles.normalBadge}>
                      {item.isBlacklisted ? '已拉黑' : '正常'}
                    </span>
                    <button
                      disabled={deleted || rowBusy}
                      onClick={() => onBlacklistChange(item, !item.isBlacklisted)}
                      style={item.isBlacklisted ? styles.secondaryButton : styles.warningButton}
                      type="button"
                    >
                      {blacklistBusy
                        ? '更新中...'
                        : item.isBlacklisted
                          ? '移出黑名单'
                          : '加入黑名单'}
                    </button>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <span style={item.lastLoginAt ? styles.bodyText : styles.mutedText}>
                    {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '暂无记录'}
                  </span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.bodyText}>{formatDateTime(item.createdAt)}</span>
                </td>
                <td style={styles.actionCell}>
                  <button
                    disabled={deleted || rowBusy}
                    onClick={() => onDelete(item)}
                    style={styles.dangerButton}
                    type="button"
                  >
                    {deleted ? '已删除' : deleting ? '删除中...' : '删除'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getNextStatus(status: AdminUserItem['status']): AdminMutableUserStatus {
  return status === 'active' ? 'disabled' : 'active';
}

function getStatusBadgeStyle(status: AdminUserItem['status']): CSSProperties {
  if (status === 'active') {
    return styles.activeBadge;
  }

  if (status === 'disabled') {
    return styles.disabledBadge;
  }

  return styles.deletedBadge;
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const statusLabels: Record<AdminUserItem['status'], string> = {
  active: '启用',
  deleted: '已删除',
  disabled: '停用',
};

const statusActionLabels: Record<AdminMutableUserStatus, string> = {
  active: '启用',
  disabled: '停用',
};

const badgeBase = {
  borderRadius: 999,
  display: 'inline-flex',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '16px',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '7px 11px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const styles = {
  actionCell: {
    borderTop: '1px solid #e5eaf1',
    padding: '12px 14px',
    textAlign: 'right',
    verticalAlign: 'top',
  },
  actionHeaderCell: {
    background: '#f8fafc',
    borderBottom: '1px solid #d8dee8',
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    padding: '10px 14px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  activeBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
  blacklistBadge: {
    ...badgeBase,
    background: '#fee2e2',
    color: '#991b1b',
  },
  bodyCell: {
    borderTop: '1px solid #e5eaf1',
    padding: '12px 14px',
    verticalAlign: 'top',
  },
  bodyText: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  controlGroup: {
    alignItems: 'start',
    display: 'grid',
    gap: 8,
    justifyItems: 'start',
  },
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
  deletedBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#64748b',
  },
  disabledBadge: {
    ...badgeBase,
    background: '#e2e8f0',
    color: '#475569',
  },
  email: {
    color: '#334155',
    fontSize: 13,
    lineHeight: '18px',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerCell: {
    background: '#f8fafc',
    borderBottom: '1px solid #d8dee8',
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    padding: '10px 14px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  idText: {
    color: '#64748b',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  name: {
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nameGroup: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
  normalBadge: {
    ...badgeBase,
    background: '#e6f4f1',
    color: '#0f766e',
  },
  roleBadge: {
    ...badgeBase,
    background: '#eef2ff',
    color: '#3730a3',
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 1080,
    width: '100%',
  },
  tableWrap: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    overflowX: 'auto',
  },
  warningButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fed7aa',
    color: '#c2410c',
  },
} satisfies Record<string, CSSProperties>;
