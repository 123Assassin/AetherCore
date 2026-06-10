'use client';

import type {
  AdminMutableUserStatus,
  AdminUserItem,
  AdminUserListInput,
  AdminUserStatus,
} from '@package/shared';
import { Plus, Search, X } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';
import { UsersStats } from './users-stats';
import { UsersTable } from './users-table';

type UserManagementMode = 'web-users' | 'system-admins';
type StatusFilter = 'all' | AdminUserStatus;
type BlacklistFilter = 'all' | 'blacklisted' | 'normal';

type UserManagementPageProps = {
  description: string;
  mode: UserManagementMode;
  showFilters?: boolean;
  showQuotaColumn?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  title: string;
};

type CreateUserFormValues = {
  email: string;
  name: string;
  password: string;
  totalQuota: string;
  username: string;
};

type QuotaFormValues = {
  credits: string;
  totalQuota: string;
};

export function UserManagementPage({
  description,
  mode,
  showFilters = true,
  showQuotaColumn = true,
  showSearch = true,
  showStats = true,
  title,
}: UserManagementPageProps) {
  const client = useTrpcClient();
  const role = mode === 'system-admins' ? 'admin' : 'user';
  const isSystemAdmins = mode === 'system-admins';
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [blacklistFilter, setBlacklistFilter] = useState<BlacklistFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState<AdminUserItem | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<ReadonlySet<string>>(() => new Set());
  const [updatingBlacklistIds, setUpdatingBlacklistIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [updatingQuotaIds, setUpdatingQuotaIds] = useState<ReadonlySet<string>>(() => new Set());
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequence = useRef(0);
  const listInput = useMemo(
    () => buildUserListInput(q, statusFilter, blacklistFilter, role),
    [blacklistFilter, q, role, statusFilter]
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
    latestListInputRef.current = buildUserListInput('', 'all', 'all', role);
    setQ('');
    setStatusFilter('all');
    setBlacklistFilter('all');
  }

  function handleSearchChange(value: string) {
    latestListInputRef.current = buildUserListInput(value, statusFilter, blacklistFilter, role);
    setQ(value);
  }

  function handleStatusFilterChange(value: StatusFilter) {
    latestListInputRef.current = buildUserListInput(q, value, blacklistFilter, role);
    setStatusFilter(value);
  }

  function handleBlacklistFilterChange(value: BlacklistFilter) {
    latestListInputRef.current = buildUserListInput(q, statusFilter, value, role);
    setBlacklistFilter(value);
  }

  async function handleCreate(values: CreateUserFormValues) {
    if (creating) {
      return;
    }

    const username = values.username.trim();
    const email = values.email.trim();
    const name = values.name.trim() || null;
    const password = values.password;

    if (!username || !email || !password) {
      setCreateError('请填写用户名、邮箱和密码。');
      return;
    }
    if (password.length < 8) {
      setCreateError('密码至少需要 8 位。');
      return;
    }

    const totalQuota = isSystemAdmins ? 0 : parseNonNegativeInteger(values.totalQuota);

    if (totalQuota === null) {
      setCreateError('初始额度必须是非负整数。');
      return;
    }

    setCreating(true);
    setCreateError(null);
    setMutationError(null);

    try {
      if (isSystemAdmins) {
        await client.adminOperations.users.createAdmin.mutate({
          email,
          name,
          password,
          username,
        });
      } else {
        await client.adminOperations.users.invite.mutate({
          email,
          name,
          password,
          totalQuota,
          username,
        });
      }

      setCreateDialogOpen(false);
      await refreshUsers();
    } catch {
      setCreateError(
        isSystemAdmins
          ? '系统管理员新增失败，请检查用户名和邮箱。'
          : '用户添加失败，请检查用户名和邮箱。'
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleQuotaSubmit(item: AdminUserItem, values: QuotaFormValues) {
    if (isUserPending(item.id)) {
      return;
    }

    const credits = parseNonNegativeInteger(values.credits);
    const totalQuota = parseNonNegativeInteger(values.totalQuota);

    if (credits === null) {
      setQuotaError('剩余额度必须是非负整数。');
      return;
    }
    if (totalQuota === null) {
      setQuotaError('总额度必须是非负整数。');
      return;
    }
    if (credits > totalQuota) {
      setQuotaError('剩余额度不能大于总额度。');
      return;
    }

    setUpdatingQuotaIds((current) => new Set(current).add(item.id));
    setQuotaError(null);
    setMutationError(null);

    try {
      await client.adminOperations.users.quota.mutate({
        credits,
        id: item.id,
        totalQuota,
      });
      setQuotaTarget(null);
      await refreshUsers();
    } catch {
      setQuotaError(`用户“${item.displayName}”额度配置失败，请稍后重试。`);
    } finally {
      setUpdatingQuotaIds((current) => deletePendingId(current, item.id));
    }
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

    if (
      !confirmInBrowser(`确认删除${isSystemAdmins ? '系统管理员' : '用户'}“${item.displayName}”？`)
    ) {
      return;
    }

    setDeletingIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.users.delete.mutate({ id: item.id });
      await refreshUsers();
    } catch {
      setMutationError(
        `${isSystemAdmins ? '系统管理员' : '用户'}“${item.displayName}”删除失败，请稍后重试。`
      );
    } finally {
      setDeletingIds((current) => deletePendingId(current, item.id));
    }
  }

  function isUserPending(userId: string): boolean {
    return (
      updatingStatusIds.has(userId) ||
      updatingBlacklistIds.has(userId) ||
      updatingQuotaIds.has(userId) ||
      deletingIds.has(userId)
    );
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {showSearch ? (
            <label className="relative">
              <Search
                className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className="focus:ring-primary/10 w-64 rounded-[14px] border border-slate-200 bg-white py-3 pr-4 pl-12 text-xs transition-all outline-none focus:ring-4"
                onChange={(event) => handleSearchChange(readControlValue(event.currentTarget))}
                placeholder="按邮箱搜索..."
                value={q}
              />
            </label>
          ) : null}
          <button
            className="bg-primary hover:bg-primary-dark shadow-primary/20 inline-flex items-center gap-2 rounded-[14px] px-5 py-3 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={creating}
            onClick={() => {
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
            type="button"
          >
            <Plus size={16} />
            {isSystemAdmins ? '新增管理员' : '添加用户'}
          </button>
        </div>
      </header>

      {showStats ? <UsersStats loading={loading} total={total} users={users} /> : null}

      {showFilters ? (
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
                handleBlacklistFilterChange(
                  readControlValue(event.currentTarget) as BlacklistFilter
                )
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
      ) : null}

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
            暂无{isSystemAdmins ? '系统管理员' : '用户'}。
          </p>
        ) : null}

        {!loading && users.length > 0 ? (
          <UsersTable
            deletingIds={deletingIds}
            items={users}
            onBlacklistChange={handleBlacklistChange}
            onDelete={handleDelete}
            onQuotaConfig={setQuotaTarget}
            onStatusChange={handleStatusChange}
            showAccessControls={!isSystemAdmins}
            showBlacklistControls={!isSystemAdmins}
            showQuotaColumn={showQuotaColumn}
            showQuotaConfig={!isSystemAdmins}
            updatingBlacklistIds={updatingBlacklistIds}
            updatingQuotaIds={updatingQuotaIds}
            updatingStatusIds={updatingStatusIds}
          />
        ) : null}
      </section>

      {createDialogOpen ? (
        <CreateUserDialog
          error={createError}
          mode={mode}
          onClose={() => {
            if (!creating) {
              setCreateDialogOpen(false);
            }
          }}
          onSubmit={handleCreate}
          submitting={creating}
        />
      ) : null}

      {quotaTarget ? (
        <QuotaConfigDialog
          error={quotaError}
          onClose={() => {
            if (!updatingQuotaIds.has(quotaTarget.id)) {
              setQuotaTarget(null);
              setQuotaError(null);
            }
          }}
          onSubmit={(values) => handleQuotaSubmit(quotaTarget, values)}
          submitting={updatingQuotaIds.has(quotaTarget.id)}
          user={quotaTarget}
        />
      ) : null}
    </main>
  );
}

function CreateUserDialog({
  error,
  mode,
  onClose,
  onSubmit,
  submitting,
}: {
  error: string | null;
  mode: UserManagementMode;
  onClose: () => void;
  onSubmit: (values: CreateUserFormValues) => void;
  submitting: boolean;
}) {
  const isSystemAdmins = mode === 'system-admins';
  const [values, setValues] = useState<CreateUserFormValues>({
    email: '',
    name: '',
    password: '',
    totalQuota: '100',
    username: '',
  });

  function updateField(field: keyof CreateUserFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form
        aria-labelledby="user-create-dialog-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3
              className="text-xl font-black tracking-tight text-slate-900"
              id="user-create-dialog-title"
            >
              {isSystemAdmins ? '新增系统管理员' : '添加用户'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {isSystemAdmins ? '创建可登录管理后台的管理员账号' : '创建可登录 web 端的平台账号'}
            </p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <TextField
            autoComplete="username"
            label="用户名"
            onChange={(value) => updateField('username', value)}
            placeholder="请输入用户名"
            value={values.username}
          />
          <TextField
            autoComplete="email"
            label="邮箱"
            onChange={(value) => updateField('email', value)}
            placeholder="name@example.com"
            type="email"
            value={values.email}
          />
          <TextField
            autoComplete="name"
            label="姓名"
            onChange={(value) => updateField('name', value)}
            placeholder="可选"
            value={values.name}
          />
          <TextField
            autoComplete="new-password"
            label="密码"
            onChange={(value) => updateField('password', value)}
            placeholder="至少 8 位"
            type="password"
            value={values.password}
          />
          {!isSystemAdmins ? (
            <TextField
              inputMode="numeric"
              label="初始额度"
              onChange={(value) => updateField('totalQuota', value)}
              placeholder="100"
              value={values.totalQuota}
            />
          ) : null}
        </div>

        {error ? (
          <p aria-live="assertive" className="mt-4 text-sm font-bold text-red-500" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="bg-primary hover:bg-primary-dark rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '提交中...' : isSystemAdmins ? '新增管理员' : '添加用户'}
          </button>
        </div>
      </form>
    </div>
  );
}

function QuotaConfigDialog({
  error,
  onClose,
  onSubmit,
  submitting,
  user,
}: {
  error: string | null;
  onClose: () => void;
  onSubmit: (values: QuotaFormValues) => void;
  submitting: boolean;
  user: AdminUserItem;
}) {
  const [values, setValues] = useState<QuotaFormValues>({
    credits: String(user.credits),
    totalQuota: String(user.totalQuota),
  });

  function updateField(field: keyof QuotaFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form
        aria-labelledby="quota-config-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3
              className="text-xl font-black tracking-tight text-slate-900"
              id="quota-config-dialog-title"
            >
              额度配置
            </h3>
            <p className="mt-1 text-sm text-slate-500">{user.displayName}</p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <TextField
            inputMode="numeric"
            label="剩余额度"
            onChange={(value) => updateField('credits', value)}
            value={values.credits}
          />
          <TextField
            inputMode="numeric"
            label="总额度"
            onChange={(value) => updateField('totalQuota', value)}
            value={values.totalQuota}
          />
        </div>

        {error ? (
          <p aria-live="assertive" className="mt-4 text-sm font-bold text-red-500" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="bg-primary hover:bg-primary-dark rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '保存中...' : '保存配置'}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  autoComplete,
  inputMode,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  inputMode?: 'numeric';
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'email' | 'password' | 'text';
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
        {label}
      </span>
      <input
        autoComplete={autoComplete}
        className="focus:ring-primary/10 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all outline-none focus:ring-4"
        inputMode={inputMode}
        onChange={(event) => onChange(readControlValue(event.currentTarget))}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
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
  blacklistFilter: BlacklistFilter,
  role: string
): AdminUserListInput {
  const input: AdminUserListInput = {
    page: 1,
    pageSize: 100,
    role,
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

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}
