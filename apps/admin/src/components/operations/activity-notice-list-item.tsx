import type { AdminActivityItem } from '@package/shared';
import type { CSSProperties } from 'react';

type ActivityNoticeListItemProps = {
  deleting?: boolean;
  item: AdminActivityItem;
  onDelete: (item: AdminActivityItem) => void;
  onEdit: (item: AdminActivityItem) => void;
};

export function ActivityNoticeListItem({
  deleting = false,
  item,
  onDelete,
  onEdit,
}: ActivityNoticeListItemProps) {
  const displayDate = item.publishedAt ?? item.createdAt;

  return (
    <article style={styles.item}>
      <div style={styles.contentBlock}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>{item.title}</h2>
          <span style={item.status === 'published' ? styles.publishedBadge : styles.draftBadge}>
            {item.status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <p style={styles.content}>{item.content}</p>
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>{item.publishedAt ? '发布时间' : '创建时间'}</span>
          <span style={styles.metaValue}>{formatDateTime(displayDate)}</span>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          disabled={deleting}
          onClick={() => onEdit(item)}
          style={styles.secondaryButton}
          type="button"
        >
          编辑
        </button>
        <button
          disabled={deleting}
          onClick={() => onDelete(item)}
          style={styles.dangerButton}
          type="button"
        >
          {deleting ? '删除中...' : '删除'}
        </button>
      </div>
    </article>
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

const badgeBase = {
  borderRadius: 999,
  display: 'inline-flex',
  flex: '0 0 auto',
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
  actions: {
    display: 'flex',
    flex: '0 0 auto',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'end',
  },
  content: {
    color: '#475569',
    display: '-webkit-box',
    fontSize: 14,
    lineHeight: '22px',
    margin: 0,
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
  },
  contentBlock: {
    display: 'grid',
    gap: 9,
    minWidth: 0,
  },
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
  draftBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#475569',
  },
  item: {
    alignItems: 'start',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    padding: 16,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
  },
  metaRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaValue: {
    color: '#334155',
    fontSize: 12,
    lineHeight: '16px',
  },
  publishedBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  title: {
    color: '#172033',
    fontSize: 17,
    lineHeight: '24px',
    margin: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: 10,
    minWidth: 0,
  },
} satisfies Record<string, CSSProperties>;
