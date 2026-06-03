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
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
        <span className="text-[10px] font-bold text-slate-500">剩余额度</span>
        <span
          className={`text-[10px] font-black ${
            percentage <= 20 ? 'text-red-500' : percentage <= 50 ? 'text-amber-500' : 'text-primary'
          }`}
        >
          {safeTotalQuota > 0 ? `${percentage}%` : '未配置'}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
        <span className="text-[10px] font-bold text-slate-500">
          {formatNumber(safeCredits)} / {formatNumber(safeTotalQuota)}
        </span>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
