'use client';

import type {
  AdminMutableUserStatus,
  AdminUserItem,
  AdminUserListInput,
  AdminUserStatus,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Users</p>
          <h2 style={styles.heading}>用户管理</h2>
        </div>
        <div aria-label="用户结果统计" style={styles.summary}>
          <strong style={styles.summaryNumber}>{loading ? '...' : total}</strong>
          <span style={styles.summaryText}>条结果</span>
        </div>
      </header>

      <UsersStats loading={loading} total={total} users={users} />

      <section aria-label="用户筛选" style={styles.filters}>
        <label style={styles.field}>
          <span style={styles.label}>搜索</span>
          <input
            onChange={(event) => handleSearchChange(readControlValue(event.currentTarget))}
            placeholder="邮箱或昵称"
            style={styles.input}
            value={q}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>状态</span>
          <select
            onChange={(event) =>
              handleStatusFilterChange(readControlValue(event.currentTarget) as StatusFilter)
            }
            style={styles.input}
            value={statusFilter}
          >
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
            <option value="deleted">已删除</option>
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>黑名单</span>
          <select
            onChange={(event) =>
              handleBlacklistFilterChange(readControlValue(event.currentTarget) as BlacklistFilter)
            }
            style={styles.input}
            value={blacklistFilter}
          >
            <option value="all">全部用户</option>
            <option value="normal">正常用户</option>
            <option value="blacklisted">黑名单用户</option>
          </select>
        </label>

        <button onClick={resetFilters} style={styles.secondaryButton} type="button">
          重置筛选
        </button>
      </section>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      {mutationError ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {mutationError}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="用户列表" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载用户列表...</p> : null}

        {!loading && users.length === 0 ? <p style={styles.stateText}>暂无用户。</p> : null}

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

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '9px 12px',
} satisfies CSSProperties;

const styles = {
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  field: {
    display: 'grid',
    gap: 6,
    minWidth: 180,
  },
  filters: {
    alignItems: 'end',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  heading: {
    color: '#172033',
    fontSize: 24,
    lineHeight: '32px',
    margin: 0,
  },
  input: {
    background: '#ffffff',
    border: '1px solid #b9c3d0',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 40,
    padding: '8px 10px',
  },
  label: {
    color: '#334155',
    fontSize: 13,
    lineHeight: '18px',
  },
  main: {
    display: 'grid',
    gap: 16,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
    minHeight: 40,
  },
  section: {
    display: 'grid',
    gap: 12,
  },
  stateText: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
    padding: 18,
  },
  summary: {
    alignItems: 'baseline',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'flex',
    gap: 6,
    padding: '10px 12px',
  },
  summaryNumber: {
    color: '#0f766e',
    fontSize: 22,
    lineHeight: '28px',
  },
  summaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
  },
} satisfies Record<string, CSSProperties>;

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
