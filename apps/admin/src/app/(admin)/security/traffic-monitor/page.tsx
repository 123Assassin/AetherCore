'use client';

import type { AdminTrafficStatsItem } from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { TrafficEngineCard } from '../../../../components/security/traffic-engine-card';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminTrafficMonitorPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminTrafficStatsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const fetchTrafficStats = useCallback(() => {
    return client.adminOperations.trafficStats.list.query({});
  }, [client]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadTrafficStats() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchTrafficStats();

        if (requestId === requestSequence.current) {
          setItems(result);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('流量监控数据加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadTrafficStats();
  }, [fetchTrafficStats]);

  const totals = items.reduce(
    (summary, item) => ({
      costAmount: summary.costAmount + item.costAmount,
      tokensTotal: summary.tokensTotal + item.tokensTotal,
      totalCalls: summary.totalCalls + item.totalCalls,
    }),
    { costAmount: 0, tokensTotal: 0, totalCalls: 0 }
  );

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Security / Traffic Monitor</p>
          <h2 style={styles.heading}>流量监控</h2>
        </div>
      </header>

      <section aria-label="流量监控概览" style={styles.summaryGrid}>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>{loading ? '...' : items.length}</strong>
          <span style={styles.summaryText}>个引擎</span>
        </div>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>
            {loading ? '...' : formatInteger(totals.tokensTotal)}
          </strong>
          <span style={styles.summaryText}>Token 总量</span>
        </div>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>
            {loading ? '...' : formatInteger(totals.totalCalls)}
          </strong>
          <span style={styles.summaryText}>总调用</span>
        </div>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>
            {loading ? '...' : formatAmount(totals.costAmount)}
          </strong>
          <span style={styles.summaryText}>累计费用</span>
        </div>
      </section>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="模型引擎流量统计" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载模型引擎流量统计...</p> : null}

        {!loading && items.length === 0 ? <p style={styles.stateText}>暂无流量统计。</p> : null}

        {!loading && items.length > 0 ? (
          <div style={styles.cardGrid}>
            {items.map((item) => (
              <TrafficEngineCard item={item} key={getTrafficStatsKey(item)} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function getTrafficStatsKey(item: AdminTrafficStatsItem): string {
  return `${item.engineId ?? 'none'}:${item.engine}:${item.currency}`;
}

const styles = {
  cardGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  heading: {
    color: '#172033',
    fontSize: 24,
    lineHeight: '32px',
    margin: 0,
  },
  main: {
    display: 'grid',
    gap: 16,
  },
  section: {
    display: 'grid',
    gap: 12,
  },
  stateText: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
    padding: 18,
  },
  summary: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 3,
    minWidth: 0,
    padding: '12px 14px',
  },
  summaryGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  },
  summaryNumber: {
    color: '#0f766e',
    fontSize: 22,
    lineHeight: '28px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  summaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
  },
} satisfies Record<string, CSSProperties>;
