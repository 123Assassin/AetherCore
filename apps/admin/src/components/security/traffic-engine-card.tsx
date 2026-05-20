import type { AdminTrafficStatsItem } from '@package/shared';
import { Clock, DollarSign, Zap } from 'lucide-react';

type TrafficEngineCardProps = {
  item: AdminTrafficStatsItem;
};

export function TrafficEngineCard({ item }: TrafficEngineCardProps) {
  return (
    <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{item.engine}</h2>
          <p className="mt-1 truncate text-xs font-medium text-slate-400">
            {item.engineId ?? '未绑定 engineId'}
          </p>
        </div>
        <span className={getSuccessRateClassName(item.successRate)}>
          成功率 {formatPercent(item.successRate)}
        </span>
      </div>

      <dl className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-3 text-slate-500">
            <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Zap aria-hidden="true" size={18} />
            </span>
            <span className="text-sm font-medium">Token 消耗</span>
          </dt>
          <dd className="truncate font-mono font-bold text-slate-900">
            {formatInteger(item.tokensTotal)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-3 text-slate-500">
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock aria-hidden="true" size={18} />
            </span>
            <span className="text-sm font-medium">平均响应</span>
          </dt>
          <dd className="truncate font-mono font-bold text-slate-900">
            {formatInteger(item.avgResponseMs)}ms
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <dt className="flex items-center gap-3 text-slate-500">
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <DollarSign aria-hidden="true" size={18} />
            </span>
            <span className="text-sm font-bold">累计费用</span>
          </dt>
          <dd className="truncate font-mono text-lg font-extrabold text-emerald-600">
            {formatCurrencyAmount(item.costAmount)} {item.currency}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
        <span>总调用 {formatInteger(item.totalCalls)}</span>
        <span>成功 {formatInteger(item.successCalls)}</span>
        <span>失败 {formatInteger(item.failedCalls)}</span>
      </div>
    </article>
  );
}

function getSuccessRateClassName(value: number): string {
  const base = 'shrink-0 rounded-md px-2.5 py-1 text-xs font-bold';

  if (value >= 0.98) {
    return `${base} bg-green-50 text-green-600`;
  }

  if (value >= 0.9) {
    return `${base} bg-amber-50 text-amber-600`;
  }

  return `${base} bg-red-50 text-red-600`;
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
