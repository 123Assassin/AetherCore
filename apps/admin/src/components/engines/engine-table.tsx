import type { AdminModelEngineItem } from '@package/shared';
import { Edit, ServerCog, Trash2 } from 'lucide-react';

type EngineTableProps = {
  deletingId: string | null;
  items: AdminModelEngineItem[];
  onDelete: (item: AdminModelEngineItem) => void;
  onEdit: (item: AdminModelEngineItem) => void;
};

export function EngineTable({ deletingId, items, onDelete, onEdit }: EngineTableProps) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                引擎名称
              </th>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                API 地址
              </th>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                API Key
              </th>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                Model
              </th>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                状态
              </th>
              <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                更新时间
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const enabled = item.status === 'enabled';

              return (
                <tr className="transition-colors hover:bg-slate-50/50" key={item.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                        <ServerCog size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{item.name}</p>
                        <p className="truncate font-mono text-[10px] text-slate-400">{item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="block max-w-[260px] truncate font-mono text-sm text-slate-500">
                      {item.apiBaseUrl}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="cursor-pointer font-mono text-sm whitespace-nowrap text-slate-500 blur-[2px] transition-all hover:blur-none">
                      {item.apiKeyMasked}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm whitespace-nowrap text-slate-500">
                      {item.modelName || providerLabels[item.provider]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-black tracking-widest uppercase ${
                        enabled
                          ? 'border border-green-100 bg-green-50 text-green-600'
                          : 'border border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {enabled ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-500">
                    {formatDateTime(item.updatedAt)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                    <button
                      aria-label={`编辑模型引擎 ${item.name}`}
                      className="hover:text-primary p-2 text-slate-400 transition-colors"
                      onClick={() => onEdit(item)}
                      type="button"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      aria-label={`删除模型引擎 ${item.name}`}
                      className="p-2 text-slate-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingId === item.id}
                      onClick={() => onDelete(item)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

const providerLabels: Record<AdminModelEngineItem['provider'], string> = {
  custom: 'Custom',
  gemini: 'Gemini',
  openai: 'OpenAI',
};
