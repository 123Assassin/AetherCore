'use client';

import type { CommentBatchRow, CommentBatchRowStatus } from '@package/shared';

type BatchCommentTableProps = {
  disabled?: boolean;
  generatingAll: boolean;
  generatingRowId: string | null;
  onGenerateRow: (row: CommentBatchRow) => void;
  rows: CommentBatchRow[];
};

const statusLabels: Record<CommentBatchRowStatus, string> = {
  error: '生成失败',
  generating: 'AI 构思中...',
  pending: '等待生成',
  success: '生成成功',
};

function formatStudent(row: CommentBatchRow) {
  return [row.nickname || '未命名', row.gender, row.grade].filter(Boolean).join(' / ');
}

function formatTags(row: CommentBatchRow) {
  return row.tags.length > 0 ? row.tags.join('、') : '无标签';
}

function getRowActionLabel(row: CommentBatchRow, active: boolean) {
  if (active || row.status === 'generating') {
    return '生成中...';
  }

  if (row.status === 'success') {
    return '已完成';
  }

  return row.status === 'error' ? '重新生成' : '生成';
}

export function BatchCommentTable({
  disabled = false,
  generatingAll,
  generatingRowId,
  onGenerateRow,
  rows,
}: BatchCommentTableProps) {
  return (
    <section aria-label="批量评语队列" className="batch-comment-table">
      <div className="batch-comment-table__scroller">
        <table>
          <thead>
            <tr>
              <th scope="col">序号</th>
              <th scope="col">学生</th>
              <th scope="col">标签 / 关键词</th>
              <th scope="col">状态</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="batch-comment-table__empty" colSpan={5}>
                  上传 Excel 后显示待生成队列。
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowBusy = generatingRowId === row.id || row.status === 'generating';
                const canGenerate = row.status === 'pending' || row.status === 'error';

                return (
                  <tr key={row.id}>
                    <td>{row.rowIndex + 1}</td>
                    <td>
                      <div className="batch-comment-table__student">{formatStudent(row)}</div>
                    </td>
                    <td>
                      <div className="batch-comment-table__meta">
                        <span>{formatTags(row)}</span>
                        <span>{row.keywords?.trim() || '无关键词'}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`batch-comment-table__status batch-comment-table__status--${row.status}`}
                      >
                        {statusLabels[row.status]}
                      </span>
                      {row.errorMessage ? (
                        <span className="batch-comment-table__row-error">{row.errorMessage}</span>
                      ) : null}
                    </td>
                    <td>
                      <button
                        className="batch-comment-table__row-button"
                        disabled={disabled || !canGenerate || generatingAll || rowBusy}
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
