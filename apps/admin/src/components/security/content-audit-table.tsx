import type { AdminContentAuditItem } from '@package/shared';
import type { CSSProperties } from 'react';

type ContentAuditTableProps = {
  deletingIds: ReadonlySet<string>;
  items: AdminContentAuditItem[];
  onDelete: (item: AdminContentAuditItem) => void;
};

export function ContentAuditTable({ deletingIds, items, onDelete }: ContentAuditTableProps) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>会话</th>
            <th style={styles.headerCell}>用户</th>
            <th style={styles.headerCell}>分类</th>
            <th style={styles.headerCell}>消息数</th>
            <th style={styles.headerCell}>最后交互</th>
            <th style={styles.headerCell}>状态</th>
            <th style={styles.actionHeaderCell}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const deleting = deletingIds.has(item.id);
            const disabled = item.isDeleted || deleting;

            return (
              <tr key={item.id}>
                <td style={styles.bodyCell}>
                  <div style={styles.stack}>
                    <strong style={styles.strongText} title={item.title}>
                      {item.title}
                    </strong>
                    <span style={styles.mutedText}>{item.conversationId}</span>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <div style={styles.stack}>
                    <span style={styles.bodyText}>{item.userEmail}</span>
                    <span style={styles.mutedText}>{item.userId ?? '无 userId'}</span>
                  </div>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.categoryBadge}>{categoryLabels[item.category]}</span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={styles.bodyText}>{item.messageCount} 条</span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={item.lastMessageAt ? styles.monoText : styles.mutedText}>
                    {item.lastMessageAt ? formatDateTime(item.lastMessageAt) : '暂无记录'}
                  </span>
                </td>
                <td style={styles.bodyCell}>
                  <span style={item.isDeleted ? styles.deletedBadge : styles.activeBadge}>
                    {item.isDeleted ? '已删除标记' : '活跃'}
                  </span>
                </td>
                <td style={styles.actionCell}>
                  <button
                    disabled={disabled}
                    onClick={() => onDelete(item)}
                    style={item.isDeleted ? styles.disabledButton : styles.dangerButton}
                    type="button"
                  >
                    {item.isDeleted ? '已删除' : deleting ? '删除中...' : '软删除'}
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

const categoryLabels: Record<AdminContentAuditItem['category'], string> = {
  chat: '对话',
  comment: '评论',
  inspiration: '灵感',
  teaching: '教学',
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
  bodyCell: {
    borderTop: '1px solid #e5eaf1',
    padding: '12px 14px',
    verticalAlign: 'top',
  },
  bodyText: {
    color: '#172033',
    display: 'block',
    fontSize: 13,
    lineHeight: '18px',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  categoryBadge: {
    ...badgeBase,
    background: '#e0f2fe',
    color: '#0369a1',
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
  disabledButton: {
    ...buttonBase,
    background: '#f8fafc',
    border: '1px solid #d8dee8',
    color: '#94a3b8',
    cursor: 'not-allowed',
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
  monoText: {
    color: '#475569',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: '#64748b',
    display: 'block',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stack: {
    display: 'grid',
    gap: 4,
    justifyItems: 'start',
  },
  strongText: {
    color: '#172033',
    display: 'block',
    fontSize: 13,
    lineHeight: '18px',
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 980,
    tableLayout: 'fixed',
    width: '100%',
  },
  tableWrap: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    overflowX: 'auto',
  },
} satisfies Record<string, CSSProperties>;
