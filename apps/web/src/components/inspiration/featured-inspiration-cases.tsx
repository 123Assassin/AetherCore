'use client';

import { Plus } from 'lucide-react';

import type { FeaturedInspirationCase } from './inspiration.data';

type FeaturedInspirationCasesProps = {
  cases: FeaturedInspirationCase[];
  disabled: boolean;
  onSelect: (item: FeaturedInspirationCase) => void;
};

export function FeaturedInspirationCases({
  cases,
  disabled,
  onSelect,
}: FeaturedInspirationCasesProps) {
  return (
    <section aria-label="精选案例" className="w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cases.map((item) => (
          <button
            aria-label={`使用精选案例：${item.title}`}
            className="group flex h-full flex-col rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:shadow-red-500/5 hover:ring-red-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            <span className="mb-4 text-3xl transition-transform duration-300 group-hover:scale-110">
              {item.icon}
            </span>
            <span className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-600 uppercase">
                {item.subject}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {item.grade}
              </span>
            </span>
            <span className="mb-2 text-base font-bold text-slate-800 transition-colors group-hover:text-red-600">
              {item.title}
            </span>
            <span className="flex-1 text-xs leading-relaxed text-slate-500">
              {item.description}
            </span>
            <span className="mt-4 flex items-center text-xs font-bold text-red-500 opacity-0 transition-opacity group-hover:opacity-100">
              立即精讲 <Plus aria-hidden="true" className="ml-1 h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
