import type { AdminSensitiveWordListItem } from '@package/shared';
import type { CSSProperties } from 'react';

type SensitiveWordListCardProps = {
  deleting?: boolean;
  item: AdminSensitiveWordListItem;
  onDelete: (item: AdminSensitiveWordListItem) => void;
  onEdit: (item: AdminSensitiveWordListItem) => void;
};

export function SensitiveWordListCard({
  deleting = false,
  item,
  onDelete,
  onEdit,
}: SensitiveWordListCardProps) {
  const previewWords = item.words.slice(0, 12);
  const hiddenWordCount = Math.max(item.words.length - previewWords.length, 0);

  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.titleGroup}>
          <h2 style={styles.name}>{item.name}</h2>
          <p style={styles.meta}>{item.words.length} 个词条</p>
        </div>
        <span style={styles.countBadge}>{item.words.length}</span>
      </div>

      <div aria-label={`${item.name} 词条预览`} style={styles.wordList}>
        {previewWords.map((word, index) => (
          <span key={`${word}-${index}`} style={styles.wordTag}>
            {word}
          </span>
        ))}
        {hiddenWordCount > 0 ? <span style={styles.moreTag}>+{hiddenWordCount}</span> : null}
      </div>

      <dl style={styles.details}>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>创建时间</dt>
          <dd style={styles.detailValue}>{formatDateTime(item.createdAt)}</dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>更新时间</dt>
          <dd style={styles.detailValue}>{formatDateTime(item.updatedAt)}</dd>
        </div>
      </dl>

      <div style={styles.footer}>
        <span style={styles.idText}>{item.id}</span>
        <div style={styles.actions}>
          <button onClick={() => onEdit(item)} style={styles.secondaryButton} type="button">
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

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '7px 11px',
} satisfies CSSProperties;

const styles = {
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'end',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'start',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  countBadge: {
    background: '#e6f4f1',
    borderRadius: 999,
    color: '#0f766e',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    padding: '4px 9px',
    whiteSpace: 'nowrap',
  },
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
  detailItem: {
    display: 'grid',
    gap: 4,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
  },
  details: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    margin: 0,
  },
  detailValue: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  footer: {
    alignItems: 'center',
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  idText: {
    color: '#64748b',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '16px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  moreTag: {
    background: '#f1f5f9',
    border: '1px solid #d8dee8',
    borderRadius: 999,
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: '16px',
    padding: '4px 8px',
  },
  name: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  titleGroup: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
  wordList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 30,
  },
  wordTag: {
    background: '#f8fafc',
    border: '1px solid #d8dee8',
    borderRadius: 999,
    color: '#334155',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: 180,
    overflow: 'hidden',
    padding: '4px 8px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;
