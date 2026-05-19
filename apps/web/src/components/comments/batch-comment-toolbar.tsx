'use client';

import type { CommentBatchJob, CommentBatchRow } from '@package/shared';

type BatchCommentToolbarProps = {
  disabled?: boolean;
  exporting: boolean;
  generatingAll: boolean;
  job: CommentBatchJob | null;
  onExport: () => void;
  onGenerateAll: () => void;
  rows: CommentBatchRow[];
};

export function BatchCommentToolbar({
  disabled = false,
  exporting,
  generatingAll,
  job,
  onExport,
  onGenerateAll,
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
    <section aria-label="批量生成操作" className="batch-comment-toolbar">
      <div className="batch-comment-toolbar__summary">
        <h2>批量队列</h2>
        <p>
          {job
            ? `${job.fileName} · 共 ${rows.length} 行 · 成功 ${successCount} 行`
            : '上传后可批量生成与导出'}
        </p>
      </div>

      <div className="batch-comment-toolbar__actions">
        <button
          className="batch-comment-toolbar__button"
          disabled={!canGenerateAll}
          onClick={onGenerateAll}
          type="button"
        >
          {generatingAll ? '批量生成中...' : '全部生成'}
        </button>
        <button
          className="batch-comment-toolbar__button batch-comment-toolbar__button--secondary"
          disabled={!canExport}
          onClick={onExport}
          type="button"
        >
          {exporting ? '导出中...' : '导出结果'}
        </button>
      </div>
    </section>
  );
}
