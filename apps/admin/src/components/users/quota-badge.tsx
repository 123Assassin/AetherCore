import type { CSSProperties } from 'react';

type QuotaBadgeProps = {
  credits: number;
  totalQuota: number;
};

export function QuotaBadge({ credits, totalQuota }: QuotaBadgeProps) {
  const safeCredits = Math.max(0, credits);
  const safeTotalQuota = Math.max(0, totalQuota);
  const percentage =
    safeTotalQuota > 0 ? Math.min(100, Math.round((safeCredits / safeTotalQuota) * 100)) : 0;

  return (
    <div aria-label={`剩余额度 ${safeCredits} / ${safeTotalQuota}`} style={styles.wrap}>
      <span style={getBadgeStyle(percentage, safeTotalQuota)}>
        {formatNumber(safeCredits)} / {formatNumber(safeTotalQuota)}
      </span>
      <span style={styles.meta}>{safeTotalQuota > 0 ? `${percentage}% 剩余` : '未配置额度'}</span>
    </div>
  );
}

function getBadgeStyle(percentage: number, totalQuota: number): CSSProperties {
  if (totalQuota <= 0) {
    return styles.emptyBadge;
  }

  if (percentage <= 20) {
    return styles.lowBadge;
  }

  if (percentage <= 50) {
    return styles.warningBadge;
  }

  return styles.healthyBadge;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

const badgeBase = {
  borderRadius: 999,
  display: 'inline-flex',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '16px',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const styles = {
  emptyBadge: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#64748b',
  },
  healthyBadge: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
  lowBadge: {
    ...badgeBase,
    background: '#fee2e2',
    color: '#991b1b',
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
  warningBadge: {
    ...badgeBase,
    background: '#fef3c7',
    color: '#92400e',
  },
  wrap: {
    alignItems: 'start',
    display: 'grid',
    gap: 4,
  },
} satisfies Record<string, CSSProperties>;
