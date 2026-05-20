'use client';

import { Plus } from 'lucide-react';

import type { TeachingExampleCard } from './teaching.data';

type TeachingExampleCardsProps = {
  disabled: boolean;
  examples: TeachingExampleCard[];
  onSelect: (item: TeachingExampleCard) => void;
};

const exampleIcons: Record<string, string> = {
  'english-tense': '🛸',
  'poem-appreciation': '✍️',
  'pythagorean-ladder': '📐',
};

export function TeachingExampleCards({ disabled, examples, onSelect }: TeachingExampleCardsProps) {
  return (
    <div className="grid w-full max-w-4xl shrink-0 grid-cols-1 gap-6 md:grid-cols-3">
      {examples.map((item) => (
        <button
          aria-label={`使用经典案例：${item.title}`}
          className="group flex h-full flex-col rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:shadow-blue-500/5 hover:ring-blue-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          key={item.id}
          onClick={() => onSelect(item)}
          type="button"
        >
          <div className="mb-4 text-3xl transition-transform duration-300 group-hover:scale-110">
            {exampleIcons[item.id] ?? '✨'}
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-600 uppercase">
              {item.subject}
            </span>
          </div>
          <h4 className="mb-2 w-full truncate text-base font-bold text-slate-800 transition-colors group-hover:text-blue-600">
            {item.title}
          </h4>
          <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
            {item.description}
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-blue-500 opacity-0 transition-opacity group-hover:opacity-100">
            一键变身 <Plus className="ml-1 h-3 w-3" />
          </div>
        </button>
      ))}
    </div>
  );
}
