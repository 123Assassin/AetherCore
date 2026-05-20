import type { AdminTrafficStatsItem } from '@package/shared';
import type { CSSProperties } from 'react';

type TrafficEngineCardProps = {
  item: AdminTrafficStatsItem;
};

export function TrafficEngineCard({ item }: TrafficEngineCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <div style={styles.engineMark} aria-hidden="true">
          AI
        </div>
        <div style={styles.titleBlock}>
          <h2 style={styles.title}>{item.engine}</h2>
          <span style={styles.engineId}>{item.engineId ?? '未绑定 engineId'}</span>
        </div>
      </div>

      <dl style={styles.metrics}>
        <div style={styles.metric}>
          <dt style={styles.label}>Token 消耗</dt>
          <dd style={styles.value}>{formatInteger(item.tokensTotal)}</dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.label}>平均响应</dt>
          <dd style={styles.value}>{formatInteger(item.avgResponseMs)} ms</dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.label}>累计费用</dt>
          <dd style={styles.costValue}>
            {formatCurrencyAmount(item.costAmount)} {item.currency}
          </dd>
        </div>
        <div style={styles.metric}>
          <dt style={styles.label}>成功率</dt>
          <dd style={styles.value}>{formatPercent(item.successRate)}</dd>
        </div>
      </dl>

      <div style={styles.calls}>
        <span style={styles.callItem}>总调用 {formatInteger(item.totalCalls)}</span>
        <span style={styles.callItem}>成功 {formatInteger(item.successCalls)}</span>
        <span style={styles.callItem}>失败 {formatInteger(item.failedCalls)}</span>
      </div>
    </article>
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: 'percent',
  }).format(value);
}

const styles = {
  callItem: {
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
  calls: {
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
  },
  card: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 16,
    minWidth: 0,
    padding: 16,
  },
  costValue: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: 800,
    lineHeight: '22px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  engineId: {
    color: '#64748b',
    display: 'block',
    fontSize: 12,
    lineHeight: '16px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  engineMark: {
    alignItems: 'center',
    background: '#e6f4f1',
    border: '1px solid #99d6cc',
    borderRadius: 6,
    color: '#0f766e',
    display: 'inline-flex',
    flex: '0 0 auto',
    fontSize: 12,
    fontWeight: 800,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 10,
    minWidth: 0,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '16px',
    margin: 0,
  },
  metric: {
    background: '#f8fafc',
    border: '1px solid #e5eaf1',
    borderRadius: 6,
    display: 'grid',
    gap: 4,
    minWidth: 0,
    padding: 10,
  },
  metrics: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    margin: 0,
  },
  title: {
    color: '#172033',
    fontSize: 17,
    lineHeight: '24px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleBlock: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
  value: {
    color: '#172033',
    fontSize: 16,
    fontWeight: 800,
    lineHeight: '22px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;
