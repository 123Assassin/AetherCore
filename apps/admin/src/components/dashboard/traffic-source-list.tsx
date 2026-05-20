export type TrafficSourceItem = {
  label: string;
  ratio: number;
  visits: string;
};

type TrafficSourceListProps = {
  items: TrafficSourceItem[];
};

export function TrafficSourceList({ items }: TrafficSourceListProps) {
  return (
    <section className="min-h-[400px] rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
      <h4 className="mb-6 text-lg font-bold text-slate-900">流量来源 Top 5</h4>
      <div className="space-y-5">
        {items.map((item, index) => (
          <div className="flex items-center justify-between gap-4" key={item.label}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                {index + 1}
              </span>
              <span className="truncate text-sm font-semibold text-slate-700">{item.label}</span>
            </div>
            <span className="shrink-0 text-sm font-black text-slate-900">
              {item.ratio}% / {item.visits}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
