'use client';

import type {
  AdminMutableUserStatus,
  AdminUserItem,
  AdminUserListInput,
  AdminUserStatus,
} from '@package/shared';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { UsersStats } from '../../../components/users/users-stats';
import { UsersTable } from '../../../components/users/users-table';
import { useTrpcClient } from '../../../trpc/provider';

type StatusFilter = 'all' | AdminUserStatus;
type BlacklistFilter = 'all' | 'blacklisted' | 'normal';

export default function AdminUsersPage() {
  const client = useTrpcClient();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [blacklistFilter, setBlacklistFilter] = useState<BlacklistFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<ReadonlySet<string>>(() => new Set());
  const [updatingBlacklistIds, setUpdatingBlacklistIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequence = useRef(0);
  const listInput = useMemo(
    () => buildUserListInput(q, statusFilter, blacklistFilter),
    [blacklistFilter, q, statusFilter]
  );
  const latestListInputRef = useRef<AdminUserListInput>(listInput);

  const fetchUsers = useCallback(
    (input: AdminUserListInput) => {
      return client.adminOperations.users.list.query(input);
    },
    [client]
  );

  const refreshUsers = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchUsers(latestListInputRef.current);

      if (requestId === requestSequence.current) {
        setUsers(result.items);
        setTotal(result.total);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('用户列表加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchUsers]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    latestListInputRef.current = listInput;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchUsers(listInput);

        if (requestId === requestSequence.current) {
          setUsers(result.items);
          setTotal(result.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('用户列表加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadUsers();
  }, [fetchUsers, listInput]);

  function resetFilters() {
    latestListInputRef.current = buildUserListInput('', 'all', 'all');
    setQ('');
    setStatusFilter('all');
    setBlacklistFilter('all');
  }

  function handleSearchChange(value: string) {
    latestListInputRef.current = buildUserListInput(value, statusFilter, blacklistFilter);
    setQ(value);
  }

  function handleStatusFilterChange(value: StatusFilter) {
    latestListInputRef.current = buildUserListInput(q, value, blacklistFilter);
    setStatusFilter(value);
  }

  function handleBlacklistFilterChange(value: BlacklistFilter) {
    latestListInputRef.current = buildUserListInput(q, statusFilter, value);
    setBlacklistFilter(value);
  }

  async function handleStatusChange(item: AdminUserItem, status: AdminMutableUserStatus) {
    if (isUserPending(item.id)) {
      return;
    }

    setUpdatingStatusIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.users.status.mutate({
        id: item.id,
        status,
      });
      await refreshUsers();
    } catch {
      setMutationError(`用户“${item.displayName}”状态更新失败，请稍后重试。`);
    } finally {
      setUpdatingStatusIds((current) => deletePendingId(current, item.id));
    }
  }

  async function handleBlacklistChange(item: AdminUserItem, isBlacklisted: boolean) {
    if (isUserPending(item.id)) {
      return;
    }

    setUpdatingBlacklistIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.users.blacklist.mutate({
        id: item.id,
        isBlacklisted,
      });
      await refreshUsers();
    } catch {
      setMutationError(`用户“${item.displayName}”黑名单状态更新失败，请稍后重试。`);
    } finally {
      setUpdatingBlacklistIds((current) => deletePendingId(current, item.id));
    }
  }

  async function handleDelete(item: AdminUserItem) {
    if (isUserPending(item.id)) {
      return;
    }

    if (!confirmInBrowser(`确认删除用户“${item.displayName}”？`)) {
      return;
    }

    setDeletingIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.users.delete.mutate({ id: item.id });
      await refreshUsers();
    } catch {
      setMutationError(`用户“${item.displayName}”删除失败，请稍后重试。`);
    } finally {
      setDeletingIds((current) => deletePendingId(current, item.id));
    }
  }

  function isUserPending(userId: string): boolean {
    return (
      updatingStatusIds.has(userId) || updatingBlacklistIds.has(userId) || deletingIds.has(userId)
    );
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">用户管理</h3>
          <p className="mt-1 text-sm text-slate-500">控制访问权限并监控 API 使用情况</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative">
            <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="focus:ring-primary/10 w-64 rounded-[14px] border border-slate-200 bg-white py-3 pr-4 pl-12 text-xs transition-all outline-none focus:ring-4"
              onChange={(event) => handleSearchChange(readControlValue(event.currentTarget))}
              placeholder="按邮箱搜索..."
              value={q}
            />
          </label>
        </div>
      </header>

      <UsersStats loading={loading} total={total} users={users} />

      <section
        aria-label="用户筛选"
        className="flex flex-wrap items-end gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid min-w-44 gap-2">
          <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            状态
          </span>
          <select
            className="focus:ring-primary/10 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition-all outline-none focus:ring-4"
            onChange={(event) =>
              handleStatusFilterChange(readControlValue(event.currentTarget) as StatusFilter)
            }
            value={statusFilter}
          >
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
            <option value="deleted">已删除</option>
          </select>
        </label>

        <label className="grid min-w-44 gap-2">
          <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            黑名单
          </span>
          <select
            className="focus:ring-primary/10 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition-all outline-none focus:ring-4"
            onChange={(event) =>
              handleBlacklistFilterChange(readControlValue(event.currentTarget) as BlacklistFilter)
            }
            value={blacklistFilter}
          >
            <option value="all">全部用户</option>
            <option value="normal">正常用户</option>
            <option value="blacklisted">黑名单用户</option>
          </select>
        </label>

        <button
          className="rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-xs font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-50"
          onClick={resetFilters}
          type="button"
        >
          重置筛选
        </button>
      </section>

      {error ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {mutationError ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="用户列表" className="space-y-4">
        {loading ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
            正在加载用户列表...
          </p>
        ) : null}

        {!loading && users.length === 0 ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
            暂无用户。
          </p>
        ) : null}

        {!loading && users.length > 0 ? (
          <UsersTable
            deletingIds={deletingIds}
            items={users}
            onBlacklistChange={handleBlacklistChange}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            updatingBlacklistIds={updatingBlacklistIds}
            updatingStatusIds={updatingStatusIds}
          />
        ) : null}
      </section>
    </main>
  );
}

function confirmInBrowser(message: string): boolean {
  const browserGlobal = globalThis as typeof globalThis & {
    confirm?: (message?: string) => boolean;
  };

  return browserGlobal.confirm?.(message) ?? false;
}

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

function deletePendingId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);

  next.delete(id);

  return next;
}

function buildUserListInput(
  q: string,
  statusFilter: StatusFilter,
  blacklistFilter: BlacklistFilter
): AdminUserListInput {
  const input: AdminUserListInput = {
    page: 1,
    pageSize: 100,
  };
  const trimmedQuery = q.trim();

  if (trimmedQuery) {
    input.q = trimmedQuery;
  }

  if (statusFilter !== 'all') {
    input.status = statusFilter;
  }

  if (blacklistFilter !== 'all') {
    input.isBlacklisted = blacklistFilter === 'blacklisted';
  }

  return input;
}
