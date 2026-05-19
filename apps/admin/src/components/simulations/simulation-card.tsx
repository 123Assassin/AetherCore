'use client';

import type { SimulationItem } from '@package/shared';
import type { CSSProperties } from 'react';

type SimulationCardProps = {
  item: SimulationItem;
  onToggleEnabled: (item: SimulationItem) => void;
  toggling?: boolean;
};

export function SimulationCard({ item, onToggleEnabled, toggling = false }: SimulationCardProps) {
  const enabled = item.isable;

  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.titleGroup}>
          <h2 style={styles.name}>{item.name}</h2>
          <p style={styles.meta}>
            {item.subject} / {item.category.name}
          </p>
        </div>
        <span style={enabled ? styles.enabledBadge : styles.disabledBadge}>
          {enabled ? '启用' : '停用'}
        </span>
      </div>

      <dl style={styles.details}>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>年级</dt>
          <dd style={styles.detailValue}>
            {item.grades.length > 0 ? item.grades.join(' / ') : '全年级'}
          </dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>入口</dt>
          <dd style={item.src ? styles.detailValue : styles.mutedValue}>
            {item.src ? '已配置' : '未配置'}
          </dd>
        </div>
        <div style={styles.detailItem}>
          <dt style={styles.detailLabel}>更新</dt>
          <dd style={styles.detailValue}>{formatDate(item.updatedAt)}</dd>
        </div>
      </dl>

      <div style={styles.footer}>
        <span style={styles.idText}>{item.id}</span>
        <button
          aria-label={`${enabled ? '停用' : '启用'} ${item.name}`}
          disabled={toggling}
          onClick={() => onToggleEnabled(item)}
          style={enabled ? styles.disableButton : styles.enableButton}
          type="button"
        >
          {toggling ? '更新中…' : enabled ? '停用' : '启用'}
        </button>
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

const badgeBase = {
  borderRadius: 999,
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
} satisfies CSSProperties;

const styles = {
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    margin: 0,
  },
  detailValue: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  disableButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  disabledBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#64748b',
  },
  enableButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  enabledBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
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
  mutedValue: {
    color: '#94a3b8',
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
  titleGroup: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
} satisfies Record<string, CSSProperties>;
