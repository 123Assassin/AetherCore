'use client';

import type { CommentBatchRow, CommentBatchRowStatus } from '@package/shared';
import { AlertCircle, Check, RefreshCw } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { getCommentCopyText } from './comment-copy.data';

type BatchCommentTableProps = {
  canGenerateRow?: (row: CommentBatchRow) => boolean;
  canGenerateRows?: boolean;
  disabled?: boolean;
  generatingAll: boolean;
  generatingRowId: string | null;
  onCommentBlur: (row: CommentBatchRow) => void;
  onCommentChange: (row: CommentBatchRow, comment: string) => void;
  onGenerateRow: (row: CommentBatchRow) => void;
  rows: CommentBatchRow[];
  savingRowIds?: Set<string>;
  similarityWarnings?: Map<string, string>;
};

const statusLabels: Record<CommentBatchRowStatus, string> = {
  error: '生成失败',
  generating: 'AI 构思中...',
  pending: '等待生成',
  success: '生成成功',
};

function getRowActionLabel(row: CommentBatchRow, active: boolean) {
  if (active || row.status === 'generating') {
    return '生成中...';
  }

  if (row.status === 'success') {
    return '换一个';
  }

  return row.status === 'error' ? '重新生成' : '单个生成';
}

function getStatusContent(status: CommentBatchRowStatus) {
  if (status === 'generating') {
    return (
      <>
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        {statusLabels[status]}
      </>
    );
  }

  if (status === 'success') {
    return (
      <>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50">
          <Check className="h-3.5 w-3.5" />
        </span>
        {statusLabels[status]}
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <AlertCircle className="h-3.5 w-3.5" />
        {statusLabels[status]}
      </>
    );
  }

  return (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      {statusLabels[status]}
    </>
  );
}

function splitTags(row: CommentBatchRow) {
  return row.tags.flatMap((tag) => tag.split(/[,，\s]+/)).filter(Boolean);
}

function formatRowIndex(rowIndex: number) {
  return String(rowIndex).padStart(2, '0');
}

export function BatchCommentTable({
  canGenerateRow,
  canGenerateRows = true,
  disabled = false,
  generatingAll,
  generatingRowId,
  onCommentBlur,
  onCommentChange,
  onGenerateRow,
  rows,
  savingRowIds = new Set<string>(),
  similarityWarnings = new Map<string, string>(),
}: BatchCommentTableProps) {
  return (
    <section aria-label="批量评语队列" className="min-w-0 flex-1 overflow-hidden bg-white">
      <div className="custom-scrollbar overflow-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              <th className="w-20 p-5 pl-8" scope="col">
                序号
              </th>
              <th className="p-5 pl-8" scope="col">
                学生信息
              </th>
              <th className="p-5" scope="col">
                评价档案 / 标签汇总
              </th>
              <th className="w-[360px] p-5" scope="col">
                生成评语内容
              </th>
              <th className="p-5" scope="col">
                当前状态
              </th>
              <th className="p-5 pr-8 text-right" scope="col">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td className="h-64 p-8 text-center text-sm font-medium text-slate-400" colSpan={6}>
                  上传 Excel 后显示待生成队列。
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowBusy = generatingRowId === row.id || row.status === 'generating';
                const rowSaving = savingRowIds.has(row.id);
                const canGenerate =
                  canGenerateRows &&
                  (canGenerateRow ? canGenerateRow(row) : true) &&
                  (row.status === 'pending' || row.status === 'error' || row.status === 'success');
                const tags = splitTags(row);
                const comment = getCommentCopyText(row.comments[0] ?? '');
                const similarityWarning = similarityWarnings.get(row.id);

                function handleCommentChange(event: ChangeEvent<HTMLTextAreaElement>) {
                  const target = event.currentTarget as unknown as { value: string };

                  onCommentChange(row, target.value);
                }

                return (
                  <tr className="group transition-colors hover:bg-slate-50/50" key={row.id}>
                    <td className="p-5 pl-8 align-middle">
                      <span className="text-xs font-black text-slate-400">
                        {formatRowIndex(row.rowIndex)}
                      </span>
                    </td>
                    <td className="p-5 pl-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">
                          {row.nickname || '--'}
                        </span>
                        <span className="mt-0.5 text-[10px] font-bold text-slate-400 uppercase">
                          {[row.grade, row.gender].filter(Boolean).join(' · ') || '未填写'}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="max-w-md">
                        <p className="line-clamp-1 text-xs font-medium text-slate-600">
                          {row.keywords?.trim() || '无具体评价内容'}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 ? (
                            <span className="text-[9px] font-bold text-slate-300">
                              +{tags.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <textarea
                        aria-label={`第 ${row.rowIndex} 行评语`}
                        className="h-28 w-full resize-none rounded-xl border-0 bg-slate-50/70 px-3 py-2.5 text-sm leading-6 text-slate-700 ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-400"
                        disabled={disabled || row.status !== 'success' || rowBusy || rowSaving}
                        onBlur={() => onCommentBlur(row)}
                        onChange={handleCommentChange}
                        placeholder={
                          row.status === 'success' ? '编辑评语内容' : '生成后显示评语内容'
                        }
                        value={comment}
                      />
                      {similarityWarning ? (
                        <span className="mt-2 block text-xs font-bold text-amber-600">
                          {similarityWarning}
                        </span>
                      ) : null}
                      {rowSaving ? (
                        <span className="mt-2 block text-xs font-bold text-slate-400">
                          保存中...
                        </span>
                      ) : null}
                    </td>
                    <td className="p-5">
                      <div
                        className={`flex items-center gap-2 text-xs font-bold ${
                          row.status === 'success'
                            ? 'text-emerald-600'
                            : row.status === 'generating'
                              ? 'text-emerald-500'
                              : row.status === 'error'
                                ? 'text-rose-500'
                                : 'text-slate-400'
                        }`}
                      >
                        {getStatusContent(row.status)}
                      </div>
                      {row.errorMessage ? (
                        <span className="mt-2 block max-w-[220px] text-xs leading-5 text-rose-500">
                          {row.errorMessage}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-5 pr-8 text-right">
                      <button
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                          canGenerate
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                        disabled={disabled || !canGenerate || generatingAll || rowBusy || rowSaving}
                        onClick={() => onGenerateRow(row)}
                        type="button"
                      >
                        {getRowActionLabel(row, rowBusy)}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
