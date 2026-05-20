import type { AdminContentAuditItem } from '@package/shared';
import { FileSearch, Trash2 } from 'lucide-react';

type ContentAuditTableProps = {
  deletingIds: ReadonlySet<string>;
  items: AdminContentAuditItem[];
  onDelete: (item: AdminContentAuditItem) => void;
  onViewDetail: (item: AdminContentAuditItem) => void;
};

export function ContentAuditTable({
  deletingIds,
  items,
  onDelete,
  onViewDetail,
}: ContentAuditTableProps) {
  return (
    <div className="overflow-x-auto rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              会话 ID
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              用户
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              消息数
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              最后交互时间
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              状态
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const deleting = deletingIds.has(item.id);
            const disabled = item.isDeleted || deleting;

            return (
              <tr className="transition-colors hover:bg-slate-50/50" key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex min-w-0 items-center gap-2 font-mono text-sm text-slate-900">
                    <FileSearch aria-hidden="true" className="text-primary/50 shrink-0" size={16} />
                    <div className="min-w-0">
                      <div className="max-w-64 truncate">{item.conversationId}</div>
                      <div className="max-w-64 truncate font-sans text-xs text-slate-400">
                        {item.title}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-slate-700">{item.userEmail}</div>
                  <div className="text-xs text-slate-400">ID: {item.userId ?? '无 userId'}</div>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-600">
                  {item.messageCount} 条
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-slate-500">
                    {item.lastMessageAt ? formatDateTime(item.lastMessageAt) : '暂无记录'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.isDeleted ? (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      已删除 (标记)
                    </span>
                  ) : (
                    <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold text-green-600">
                      活跃
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-2">
                    <button
                      className="text-primary hover:bg-primary/5 rounded-xl p-2 font-medium transition-colors"
                      onClick={() => onViewDetail(item)}
                      type="button"
                    >
                      查看详情
                    </button>
                    {!item.isDeleted ? (
                      <button
                        aria-label={`软删除会话 ${item.title}`}
                        className="rounded-xl p-2 text-slate-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled}
                        onClick={() => onDelete(item)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        <span className="sr-only">{deleting ? '删除中' : '软删除'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">已删除</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
