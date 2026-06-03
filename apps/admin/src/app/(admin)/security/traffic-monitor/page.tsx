'use client';

import type { AdminTrafficStatsItem } from '@package/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">流量监控</h1>
          <p className="mt-1 text-sm text-slate-500">
            监控各模型引擎的 Token 消耗、响应时长与调用费用
          </p>
        </div>
      </header>

      {error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="模型引擎流量统计">
        {loading ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            正在加载模型引擎流量统计...
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            暂无流量统计。
          </p>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {items.map((item) => (
              <TrafficEngineCard item={item} key={getTrafficStatsKey(item)} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getTrafficStatsKey(item: AdminTrafficStatsItem): string {
  return `${item.engineId ?? 'none'}:${item.engine}:${item.currency}`;
}
