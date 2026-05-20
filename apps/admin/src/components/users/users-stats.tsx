import type { AdminUserItem } from '@package/shared';
import type { CSSProperties } from 'react';

type UsersStatsProps = {
  loading: boolean;
  total: number;
  users: AdminUserItem[];
};

export function UsersStats({ loading, total, users }: UsersStatsProps) {
  const activeCount = users.filter(
    (user) => user.status === 'active' && !user.isBlacklisted
  ).length;
  const blacklistedCount = users.filter((user) => user.isBlacklisted).length;
  const disabledCount = users.filter((user) => user.status === 'disabled').length;
  const creditsTotal = users.reduce((sum, user) => sum + Math.max(0, user.credits), 0);

  return (
    <section aria-label="用户统计" style={styles.grid}>
      <StatItem label="筛选结果" loading={loading} value={total} />
      <StatItem label="可用用户" loading={loading} value={activeCount} />
      <StatItem label="黑名单" loading={loading} value={blacklistedCount} />
      <StatItem label="停用用户" loading={loading} value={disabledCount} />
      <StatItem label="剩余额度" loading={loading} value={creditsTotal} />
    </section>
  );
}

function StatItem({ label, loading, value }: { label: string; loading: boolean; value: number }) {
  return (
    <div style={styles.item}>
      <strong style={styles.value}>{loading ? '...' : formatNumber(value)}</strong>
      <span style={styles.label}>{label}</span>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

const styles = {
  grid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  },
  item: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 4,
    padding: '12px 14px',
  },
  label: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: '18px',
  },
  value: {
    color: '#0f766e',
    fontSize: 22,
    lineHeight: '28px',
  },
} satisfies Record<string, CSSProperties>;
