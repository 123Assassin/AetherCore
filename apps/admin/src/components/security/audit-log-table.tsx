import type { AdminAuditLogType, AdminSystemAuditItem } from '@package/shared';
import { Eye } from 'lucide-react';

type AuditLogTableProps = {
  items: AdminSystemAuditItem[];
  onViewDetails: (item: AdminSystemAuditItem) => void;
};

export function AuditLogTable({ items, onViewDetails }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1160px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              发生时间
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              操作账号
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              事件级别
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              日志类型
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              API 路由
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              请求结果
            </th>
            <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr className="transition-colors hover:bg-slate-50/50" key={item.logId}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-mono text-sm text-slate-500">
                  {formatTimestamp(item.timestamp)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="max-w-52 truncate font-mono text-sm font-bold text-slate-900">
                  {getStringDetail(item.details, 'actorAccount') ?? '未记录'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={getLevelBadgeClassName(item.level)}>
                  {levelLabels[item.level]}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-700">
                    {logTypeLabels[item.logType]}
                  </div>
                  <div className="font-mono text-xs text-slate-400">#{item.logType}</div>
                </div>
              </td>
              <td className="px-6 py-4">
                <strong className="block max-w-72 truncate font-mono text-sm font-bold text-slate-900">
                  {getStringDetail(item.details, 'apiRoute') ?? '未记录'}
                </strong>
              </td>
              <td className="px-6 py-4">
                <span className="block max-w-72 truncate text-sm text-slate-500">
                  {formatRequestResult(item.details.requestResult)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => onViewDetails(item)}
                  type="button"
                >
                  <Eye aria-hidden="true" size={16} />
                  查看详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getLevelBadgeClassName(level: AdminSystemAuditItem['level']): string {
  const base = 'rounded-md px-2.5 py-1 text-xs font-bold';

  return level === 0 ? `${base} bg-red-50 text-red-600` : `${base} bg-green-50 text-green-600`;
}

function formatTimestamp(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  return new Date(value * 1000).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStringDetail(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];

  return typeof value === 'string' && value ? value : null;
}

function formatRequestResult(value: unknown): string {
  if (!isRecord(value)) {
    return '未记录';
  }

  if (value.success === true) {
    return '成功';
  }

  if (value.success === false && isRecord(value.error)) {
    const code = typeof value.error.code === 'string' ? value.error.code : 'ERROR';
    const message = typeof value.error.message === 'string' ? value.error.message : '请求失败';

    return `失败：${code} / ${message}`;
  }

  return '未记录';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const levelLabels: Record<AdminSystemAuditItem['level'], string> = {
  0: '告警',
  1: '信息',
};

const logTypeLabels: Record<AdminAuditLogType, string> = {
  0: '系统管理员管理',
  1: '用户管理',
  2: '系统设置',
  3: '智能体管理',
  4: 'AI Prompt管理',
  5: '敏感词库管理',
  6: '仿真案例库管理',
  7: '引擎调度中心',
  8: '活动管理',
  9: '裂变管理',
  10: '系统审计日志',
  11: 'AI内容审计',
  12: '流量监控',
  13: '消息告警中心',
};
