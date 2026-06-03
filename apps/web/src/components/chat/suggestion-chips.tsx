'use client';

import { MessageSquarePlus } from 'lucide-react';

type SuggestionChipsProps = {
  disabled: boolean;
  onSelect: (suggestion: string) => void;
  suggestions: string[];
};

export function SuggestionChips({ disabled, onSelect, suggestions }: SuggestionChipsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section aria-label="建议问题" className="mt-3 pt-3">
      <p className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-400">
        <MessageSquarePlus className="h-3.5 w-3.5" /> 猜你想问：
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            aria-label={`发送建议：${suggestion}`}
            className="rounded-full bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
