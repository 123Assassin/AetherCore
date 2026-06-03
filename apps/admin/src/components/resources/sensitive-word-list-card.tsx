'use client';

import type { AdminSensitiveWordListItem } from '@package/shared';
import { Edit, ShieldAlert, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

type SensitiveWordListCardProps = {
  deleting?: boolean;
  item: AdminSensitiveWordListItem;
  onDelete: (item: AdminSensitiveWordListItem) => void;
  onEdit: (item: AdminSensitiveWordListItem) => void;
};

export function SensitiveWordListCard({
  deleting = false,
  item,
  onDelete,
  onEdit,
}: SensitiveWordListCardProps) {
  const previewWords = item.words.slice(0, 20);
  const hiddenWordCount = Math.max(item.words.length - previewWords.length, 0);

  return (
    <motion.article
      className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm transition-all hover:shadow-xl"
      layout
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert size={24} />
        </div>
        <span className="text-xs font-bold text-slate-400">{item.words.length} 个敏感词</span>
      </div>

      <h4 className="text-lg font-bold text-slate-900">{item.name}</h4>

      <div className="mt-4 flex min-h-8 flex-wrap gap-2">
        {previewWords.map((word, index) => (
          <span
            className="max-w-44 truncate rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600"
            key={`${word}-${index}`}
          >
            {word}
          </span>
        ))}
        {hiddenWordCount > 0 ? (
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
            +{hiddenWordCount}
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">更新于 {formatDate(item.updatedAt)}</span>
        <div className="flex gap-2">
          <button
            aria-label={`编辑敏感词库 ${item.name}`}
            className="hover:text-primary rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
            onClick={() => onEdit(item)}
            type="button"
          >
            <Edit size={16} />
          </button>
          <button
            aria-label={`删除敏感词库 ${item.name}`}
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
