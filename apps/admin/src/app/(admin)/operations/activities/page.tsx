'use client';

import type {
  AdminActivityCreateInput,
  AdminActivityItem,
  AdminActivityListInput,
  AdminActivityStatus,
  AdminActivityUpdateInput,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActivityNoticeFormDialog } from '../../../../components/operations/activity-notice-form-dialog';
import { ActivityNoticeListItem } from '../../../../components/operations/activity-notice-list-item';
import { useTrpcClient } from '../../../../trpc/provider';

type StatusFilter = 'all' | AdminActivityStatus;

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
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Operations / Activities</p>
          <h2 style={styles.heading}>活动与通告管理</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="活动通告统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{loading ? '...' : total}</strong>
            <span style={styles.summaryText}>条结果</span>
          </div>
          <button onClick={handleCreateClick} style={styles.primaryButton} type="button">
            新建活动通告
          </button>
        </div>
      </header>

      <section aria-label="活动通告筛选" style={styles.filters}>
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
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
          </select>
        </label>

        <div aria-label="当前筛选统计" style={styles.filterSummary}>
          <span style={styles.filterStat}>已发布 {publishedCount}</span>
          <span style={styles.filterStat}>草稿 {draftCount}</span>
        </div>
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

      <section aria-busy={loading} aria-label="活动通告列表" style={styles.list}>
        {loading ? <p style={styles.stateText}>正在加载活动通告...</p> : null}

        {!loading && items.length === 0 ? <p style={styles.stateText}>暂无活动通告。</p> : null}

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
      </section>

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

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

function deletePendingId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);

  next.delete(id);

  return next;
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
    justifyContent: 'space-between',
    padding: 14,
  },
  filterStat: {
    background: '#f8fafc',
    border: '1px solid #d8dee8',
    borderRadius: 999,
    color: '#334155',
    fontSize: 12,
    lineHeight: '16px',
    padding: '4px 8px',
    whiteSpace: 'nowrap',
  },
  filterSummary: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'end',
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
  list: {
    display: 'grid',
    gap: 12,
  },
  main: {
    display: 'grid',
    gap: 16,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
    minHeight: 40,
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
