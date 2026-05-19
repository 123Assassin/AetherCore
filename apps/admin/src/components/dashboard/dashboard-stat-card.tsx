import type { CSSProperties } from 'react';

type DashboardStatCardProps = {
  label: string;
  tone: 'green' | 'blue' | 'amber' | 'slate';
  trend: string;
  value: string;
};

export function DashboardStatCard({ label, tone, trend, value }: DashboardStatCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.label}>{label}</span>
        <span style={toneStyles[tone]}>{trend}</span>
      </div>
      <strong style={styles.value}>{value}</strong>
    </article>
  );
}

const badgeBase = {
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '16px',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 12,
    minHeight: 104,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
  },
  label: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    color: '#172033',
    fontSize: 26,
    lineHeight: '34px',
  },
} satisfies Record<string, CSSProperties>;

const toneStyles = {
  amber: {
    ...badgeBase,
    background: '#fef3c7',
    color: '#92400e',
  },
  blue: {
    ...badgeBase,
    background: '#dbeafe',
    color: '#1d4ed8',
  },
  green: {
    ...badgeBase,
    background: '#dcfce7',
    color: '#166534',
  },
  slate: {
    ...badgeBase,
    background: '#f1f5f9',
    color: '#475569',
  },
} satisfies Record<DashboardStatCardProps['tone'], CSSProperties>;
