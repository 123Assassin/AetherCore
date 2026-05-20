import type { AdminSystemAuditItem } from '@package/shared';

type AuditLogTableProps = {
  items: AdminSystemAuditItem[];
};

export function AuditLogTable({ items }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[940px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              时间
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              操作人
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              操作动作
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              详情
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              类型
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr className="transition-colors hover:bg-slate-50/50" key={item.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-mono text-sm text-slate-500">
                  {formatDateTime(item.createdAt)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-700">
                    {actorTypeLabels[item.actorType]}
                  </div>
                  <div className="max-w-52 truncate text-xs text-slate-400">
                    {item.actorId ?? '无 actorId'}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <strong className="block max-w-64 truncate text-sm font-bold text-slate-900">
                  {item.action}
                </strong>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">
                    {item.resourceType ?? '未指定资源'}
                    {item.resourceId ? ` / ${item.resourceId}` : ''}
                  </div>
                  <div className="max-w-[360px] truncate font-mono text-xs text-slate-400">
                    IP: {item.ip ?? '未记录'} | {formatMetadata(item.metadata)}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={getActorBadgeClassName(item.actorType)}>
                  {actorTypeLabels[item.actorType]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getActorBadgeClassName(actorType: AdminSystemAuditItem['actorType']): string {
  const base = 'rounded-md px-2.5 py-1 text-xs font-bold';

  if (actorType === 'admin') {
    return `${base} bg-red-50 text-red-600`;
  }

  if (actorType === 'user') {
    return `${base} bg-green-50 text-green-600`;
  }

  return `${base} bg-slate-100 text-slate-600`;
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

function formatMetadata(value: Record<string, unknown> | null): string {
  if (!value) {
    return '无元数据';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '元数据无法显示';
  }
}

const actorTypeLabels: Record<AdminSystemAuditItem['actorType'], string> = {
  admin: '管理员',
  system: '系统',
  user: '用户',
};
