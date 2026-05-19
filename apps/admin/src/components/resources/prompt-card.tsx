import type { AdminPromptItem } from '@package/shared';
import type { CSSProperties } from 'react';

import { PromptMarkdownPreview } from './prompt-markdown-preview';

type PromptCardProps = {
  deleting?: boolean;
  item: AdminPromptItem;
  onDelete: (item: AdminPromptItem) => void;
  onEdit: (item: AdminPromptItem) => void;
};

export function PromptCard({ deleting = false, item, onDelete, onEdit }: PromptCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.titleGroup}>
          <h2 style={styles.name}>{item.title}</h2>
          <p style={styles.meta}>版本 {item.version}</p>
        </div>
        <span style={styles.updatedAt}>更新 {formatDate(item.updatedAt)}</span>
      </div>

      <div style={styles.previewBox}>
        <PromptMarkdownPreview content={item.content} />
      </div>

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
            {deleting ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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
  dangerButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #fecaca',
    color: '#b91c1c',
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
  name: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  previewBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    maxHeight: 220,
    overflow: 'auto',
    padding: 12,
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
  updatedAt: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;
