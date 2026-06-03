'use client';

import type { AdminPromptItem } from '@package/shared';
import { Edit, TerminalSquare, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { PromptMarkdownPreview } from './prompt-markdown-preview';

type PromptCardProps = {
  deleting?: boolean;
  item: AdminPromptItem;
  onDelete: (item: AdminPromptItem) => void;
  onEdit: (item: AdminPromptItem) => void;
};

export function PromptCard({ deleting = false, item, onDelete, onEdit }: PromptCardProps) {
  return (
    <motion.article
      className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm transition-all hover:shadow-xl"
      layout
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <TerminalSquare size={24} />
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {item.version}
        </span>
      </div>

      <h4 className="truncate text-lg font-bold text-slate-900">{item.title}</h4>
      <div className="mt-2 line-clamp-3 min-h-[72px] overflow-hidden text-sm text-slate-500">
        <PromptMarkdownPreview content={item.content} />
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">{formatDate(item.updatedAt)}</span>
        <div className="flex gap-2">
          <button
            aria-label={`编辑 Prompt ${item.title}`}
            className="hover:text-primary rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
            onClick={() => onEdit(item)}
            type="button"
          >
            <Edit size={16} />
          </button>
          <button
            aria-label={`删除 Prompt ${item.title}`}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleting}
            onClick={() => onDelete(item)}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(timestamp);
}
