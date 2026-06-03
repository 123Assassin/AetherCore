'use client';

import type {
  AdminActivityCreateInput,
  AdminActivityItem,
  AdminActivityListInput,
  AdminActivityStatus,
  AdminActivityUpdateInput,
} from '@package/shared';
import { Activity, Plus } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActivityNoticeFormDialog } from '../../../../components/operations/activity-notice-form-dialog';
import { ActivityNoticeListItem } from '../../../../components/operations/activity-notice-list-item';
import { useTrpcClient } from '../../../../trpc/provider';

type StatusFilter = 'all' | AdminActivityStatus;

const activityFilterOptions: { label: string; value: StatusFilter }[] = [
  { label: '全部状态', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
];

export default function AdminActivitiesPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminActivityItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequence = useRef(0);
  const listInput = useMemo(() => buildActivityListInput(statusFilter), [statusFilter]);
  const latestListInputRef = useRef<AdminActivityListInput>(listInput);

  const fetchActivities = useCallback(
    (input: AdminActivityListInput) => {
      return client.adminOperations.activities.list.query(input);
    },
    [client]
  );

  const refreshActivities = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchActivities(latestListInputRef.current);

      if (requestId === requestSequence.current) {
        setItems(result.items);
        setTotal(result.total);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('活动通告加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchActivities]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    latestListInputRef.current = listInput;

    async function loadActivities() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchActivities(listInput);

        if (requestId === requestSequence.current) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('活动通告加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadActivities();
  }, [fetchActivities, listInput]);

  function handleCreateClick() {
    setEditingItem(null);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleEditClick(item: AdminActivityItem) {
    setEditingItem(item);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleStatusFilterChange(value: StatusFilter) {
    latestListInputRef.current = buildActivityListInput(value);
    setStatusFilter(value);
  }

  async function handleSubmit(input: AdminActivityCreateInput) {
    const activeItem = editingItem;

    setSubmitting(true);
    setDialogError(null);
    setMutationError(null);

    try {
      if (activeItem) {
        const updateInput: AdminActivityUpdateInput = {
          id: activeItem.id,
          ...input,
        };

        await client.adminOperations.activities.update.mutate(updateInput);
      } else {
        await client.adminOperations.activities.create.mutate(input);
      }
    } catch {
      setDialogError(
        activeItem ? '活动通告更新失败，请检查内容后重试。' : '活动通告创建失败，请检查内容后重试。'
      );
      setSubmitting(false);
      return;
    }

    setDialogOpen(false);
    setEditingItem(null);
    setDialogError(null);
    setSubmitting(false);
    await refreshActivities();
  }

  async function handleDelete(item: AdminActivityItem) {
    if (deletingIds.has(item.id)) {
      return;
    }

    if (!confirmInBrowser(`确认删除活动通告“${item.title}”？`)) {
      return;
    }

    setDeletingIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.activities.delete.mutate({ id: item.id });
    } catch {
      setMutationError(`活动通告“${item.title}”删除失败，请稍后重试。`);
      setDeletingIds((current) => deletePendingId(current, item.id));
      return;
    }

    await refreshActivities();
    setDeletingIds((current) => deletePendingId(current, item.id));
  }

  function handleDialogClose() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
  }

  const publishedCount = items.filter((item) => item.status === 'published').length;
  const draftCount = items.filter((item) => item.status === 'draft').length;

  return (
    <main className="space-y-8">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">活动与通告管理</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            推送系统消息、营销活动及功能更新给所有用户
          </p>
        </div>
        <button
          className="bg-primary hover:bg-primary-dark shadow-primary/30 flex items-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
          onClick={handleCreateClick}
          type="button"
        >
          <Plus size={20} />
          发布新活动通告
        </button>
      </header>

      <section
        aria-label="活动通告筛选"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex rounded-2xl border border-slate-200/50 bg-slate-100 p-1.5 shadow-inner">
          {activityFilterOptions.map((option) => (
            <button
              aria-pressed={statusFilter === option.value}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                statusFilter === option.value
                  ? 'text-primary bg-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              key={option.value}
              onClick={() => handleStatusFilterChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
            共 {loading ? '...' : total} 条
          </span>
          <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
            已发布 {publishedCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
            草稿 {draftCount}
          </span>
        </div>
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

      <section
        aria-busy={loading}
        aria-label="活动通告列表"
        className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
      >
        <div className="grid grid-cols-1 divide-y divide-slate-100">
          {loading ? (
            <p className="p-8 text-sm font-semibold text-slate-400">正在加载活动通告...</p>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="space-y-4 p-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                <Activity size={40} />
              </div>
              <p className="font-medium tracking-tight text-slate-400">暂无已发布的活动通告</p>
            </div>
          ) : null}

          {!loading
            ? items.map((item) => (
                <ActivityNoticeListItem
                  deleting={deletingIds.has(item.id)}
                  item={item}
                  key={item.id}
                  onDelete={handleDelete}
                  onEdit={handleEditClick}
                />
              ))
            : null}
        </div>
      </section>

      <AnimatePresence>
        {dialogOpen ? (
          <ActivityNoticeFormDialog
            activity={editingItem}
            onClose={handleDialogClose}
            onSubmit={handleSubmit}
            open={dialogOpen}
            submitError={dialogError}
            submitting={submitting}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function buildActivityListInput(statusFilter: StatusFilter): AdminActivityListInput {
  const input: AdminActivityListInput = {
    page: 1,
    pageSize: 100,
  };

  if (statusFilter !== 'all') {
    input.status = statusFilter;
  }

  return input;
}

function confirmInBrowser(message: string): boolean {
  const browserGlobal = globalThis as typeof globalThis & {
    confirm?: (message?: string) => boolean;
  };

  return browserGlobal.confirm?.(message) ?? false;
}

function deletePendingId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);

  next.delete(id);

  return next;
}
