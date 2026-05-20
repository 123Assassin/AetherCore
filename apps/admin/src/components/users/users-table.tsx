import type { AdminMutableUserStatus, AdminUserItem } from '@package/shared';
import { Ban, Shield, ShieldBan, Trash2 } from 'lucide-react';

import { QuotaBadge } from './quota-badge';

type UsersTableProps = {
  deletingIds: ReadonlySet<string>;
  items: AdminUserItem[];
  onBlacklistChange: (item: AdminUserItem, isBlacklisted: boolean) => void;
  onDelete: (item: AdminUserItem) => void;
  onStatusChange: (item: AdminUserItem, status: AdminMutableUserStatus) => void;
  updatingBlacklistIds: ReadonlySet<string>;
  updatingStatusIds: ReadonlySet<string>;
};

export function UsersTable({
  deletingIds,
  items,
  onBlacklistChange,
  onDelete,
  onStatusChange,
  updatingBlacklistIds,
  updatingStatusIds,
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                用户资料及邮箱
              </th>
              <th className="px-8 py-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                状态
              </th>
              <th className="px-8 py-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                资源分配 (配额)
              </th>
              <th className="px-8 py-6 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                最近登录
              </th>
              <th className="px-8 py-6 text-right text-[10px] font-black tracking-widest text-slate-500 uppercase">
                管理操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const deleted = item.status === 'deleted';
              const statusBusy = updatingStatusIds.has(item.id);
              const blacklistBusy = updatingBlacklistIds.has(item.id);
              const deleting = deletingIds.has(item.id);
              const rowBusy = statusBusy || blacklistBusy || deleting;
              const nextStatus = getNextStatus(item.status);

              return (
                <tr className="group transition-colors hover:bg-slate-50" key={item.id}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="group-hover:border-primary group-hover:bg-primary flex h-12 w-12 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-100 text-lg font-extrabold text-slate-600 shadow-sm transition-all duration-300 group-hover:text-white">
                        {item.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                          <span className="max-w-[240px] truncate">{item.displayName}</span>
                          {item.isBlacklisted ? (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600 uppercase">
                              黑名单
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                          {item.email}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] tracking-tighter text-slate-400 uppercase">
                          UID: {item.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          item.status === 'active'
                            ? 'bg-green-500'
                            : item.status === 'disabled'
                              ? 'animate-pulse bg-amber-500'
                              : 'bg-slate-300'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-black tracking-widest uppercase ${
                          item.status === 'active'
                            ? 'text-green-600'
                            : item.status === 'disabled'
                              ? 'text-amber-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <QuotaBadge credits={item.credits} totalQuota={item.totalQuota} />
                  </td>
                  <td className="px-8 py-6 text-sm whitespace-nowrap text-slate-500">
                    {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '暂无记录'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex translate-x-0 items-center justify-end gap-1 opacity-100 transition-all duration-300 md:translate-x-3 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
                      <button
                        aria-label={`${item.status === 'active' ? '限制访问' : '恢复访问'} ${item.displayName}`}
                        className={`rounded-xl p-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.status === 'active'
                            ? 'text-amber-400 hover:bg-amber-50'
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                        disabled={deleted || rowBusy}
                        onClick={() => onStatusChange(item, nextStatus)}
                        title={item.status === 'active' ? '限制访问' : '恢复访问'}
                        type="button"
                      >
                        <Ban size={18} />
                      </button>
                      <button
                        aria-label={`${item.isBlacklisted ? '撤回黑名单' : '加入黑名单'} ${item.displayName}`}
                        className={`rounded-xl p-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.isBlacklisted
                            ? 'text-blue-500 hover:bg-blue-50'
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                        disabled={deleted || rowBusy}
                        onClick={() => onBlacklistChange(item, !item.isBlacklisted)}
                        title={item.isBlacklisted ? '撤回黑名单' : '加入黑名单'}
                        type="button"
                      >
                        {item.isBlacklisted ? <Shield size={18} /> : <ShieldBan size={18} />}
                      </button>
                      <button
                        aria-label={`${deleted ? '用户已删除' : deleting ? '正在删除' : '删除用户'} ${item.displayName}`}
                        className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={deleted || rowBusy}
                        onClick={() => onDelete(item)}
                        title={deleted ? '已删除' : deleting ? '删除中' : '删除用户'}
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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

function getNextStatus(status: AdminUserItem['status']): AdminMutableUserStatus {
  return status === 'active' ? 'disabled' : 'active';
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

const statusLabels: Record<AdminUserItem['status'], string> = {
  active: '正常',
  deleted: '已删除',
  disabled: '受限',
};
