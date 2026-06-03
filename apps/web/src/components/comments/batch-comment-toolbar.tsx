'use client';

import type { CommentBatchJob, CommentBatchRow } from '@package/shared';
import { Download, FileSpreadsheet, Play } from 'lucide-react';

type BatchCommentToolbarProps = {
  disabled?: boolean;
  exporting: boolean;
  generatingAll: boolean;
  job: CommentBatchJob | null;
  onExport: () => void;
  onGenerateAll: () => void;
  onReset?: () => void;
  rows: CommentBatchRow[];
};

export function BatchCommentToolbar({
  disabled = false,
  exporting,
  generatingAll,
  job,
  onExport,
  onGenerateAll,
  onReset,
  rows,
}: BatchCommentToolbarProps) {
  const successCount = rows.filter((row) => row.status === 'success').length;
  const generatableCount = rows.filter(
    (row) => row.status === 'pending' || row.status === 'error'
  ).length;
  const canExport = Boolean(job) && successCount > 0 && !disabled && !exporting && !generatingAll;
  const canGenerateAll =
    Boolean(job) && generatableCount > 0 && !disabled && !generatingAll && !exporting;

  return (
    <section
      aria-label="批量生成操作"
      className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/30 p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-3 text-lg font-black text-slate-800">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          已导入待生成队列
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-600">
            {rows.length}
          </span>
        </h3>
        <p className="mt-1 text-xs font-medium text-slate-400">
          {job
            ? `${job.fileName} · 成功 ${successCount} 行 · 预计消耗额度：${generatableCount} 次`
            : '上传后可批量生成与导出'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 lg:justify-end">
        {onReset ? (
          <button
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50"
            disabled={disabled || generatingAll || exporting}
            onClick={onReset}
            type="button"
          >
            重新上传
          </button>
        ) : null}
        <button
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-40"
          disabled={!canGenerateAll}
          onClick={onGenerateAll}
          type="button"
        >
          <Play className="h-4 w-4 fill-current" />
          {generatingAll ? '批量生成中...' : '一键全部生成'}
        </button>
        <div className="hidden h-10 w-px bg-slate-200 lg:block" />
        <button
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-emerald-600 shadow-sm ring-1 ring-emerald-500/30 transition-all hover:bg-emerald-50 disabled:opacity-30 disabled:grayscale"
          disabled={!canExport}
          onClick={onExport}
          type="button"
        >
          <Download className="h-4 w-4" />
          {exporting ? '导出中...' : '导出生成结果'}
        </button>
      </div>
    </section>
  );
}
