import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

export type ActiveSimulationFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SimulationResultsHeaderProps = {
  activeFilters: ActiveSimulationFilter[];
  loading?: boolean;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  search: string;
  total: number;
};

export function SimulationResultsHeader({
  activeFilters,
  loading = false,
  onReset,
  onSearchChange,
  search,
  total,
}: SimulationResultsHeaderProps) {
  const countLabel = loading ? '正在加载资源...' : `${total} 个结果`;

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white p-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
        <h1 className="shrink-0 text-2xl font-bold tracking-tight text-slate-800">{countLabel}</h1>

        {activeFilters.length > 0 ? (
          <div aria-label="已选筛选" className="flex min-w-0 flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                className="flex max-w-48 items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-100"
                key={filter.id}
              >
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {filter.label}
                </span>
                <button
                  aria-label={`移除筛选 ${filter.label}`}
                  className="hover:text-red-800"
                  onClick={filter.onRemove}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              className="text-xs font-bold text-slate-400 transition-colors hover:text-red-500"
              onClick={onReset}
              type="button"
            >
              清除全部
            </button>
          </div>
        ) : null}
      </div>

      <label className="relative w-full shrink-0 sm:w-64">
        <span className="sr-only">搜索仿真实验</span>
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          aria-label="搜索仿真实验"
          className="w-full rounded-xl border-none bg-slate-100 py-2 pr-4 pl-10 text-sm transition-all outline-none focus:ring-2 focus:ring-red-500"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const target = event.currentTarget as unknown as { value: string };

            onSearchChange(target.value);
          }}
          placeholder="搜索仿真实验..."
          type="search"
          value={search}
        />
      </label>
    </header>
  );
}
