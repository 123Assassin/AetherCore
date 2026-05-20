'use client';

import type {
  AdminSensitiveWordListCreateInput,
  AdminSensitiveWordListItem,
  AdminSensitiveWordListUpdateInput,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { SensitiveWordFormDialog } from '../../../../components/resources/sensitive-word-form-dialog';
import { SensitiveWordListCard } from '../../../../components/resources/sensitive-word-list-card';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminSensitiveWordsPage() {
  const client = useTrpcClient();
  const [lists, setLists] = useState<AdminSensitiveWordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<AdminSensitiveWordListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const fetchLists = useCallback(() => {
    return client.adminResources.sensitiveWordLists.list.query();
  }, [client]);

  const refreshLists = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const nextLists = await fetchLists();

      if (requestId === requestSequence.current) {
        setLists(nextLists);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('敏感词库加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchLists]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadLists() {
      setLoading(true);
      setError(null);

      try {
        const nextLists = await fetchLists();

        if (requestId === requestSequence.current) {
          setLists(nextLists);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('敏感词库加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadLists();
  }, [fetchLists]);

  function handleCreateClick() {
    setEditingList(null);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleEditClick(list: AdminSensitiveWordListItem) {
    setEditingList(list);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(input: AdminSensitiveWordListCreateInput) {
    const activeList = editingList;

    setSubmitting(true);
    setDialogError(null);
    setMutationError(null);

    try {
      if (activeList) {
        const updateInput: AdminSensitiveWordListUpdateInput = {
          id: activeList.id,
          ...input,
        };

        await client.adminResources.sensitiveWordLists.update.mutate(updateInput);
      } else {
        await client.adminResources.sensitiveWordLists.create.mutate(input);
      }

      await refreshLists();
      setDialogOpen(false);
      setEditingList(null);
      setDialogError(null);
    } catch {
      setDialogError(
        activeList ? '敏感词库更新失败，请检查内容后重试。' : '敏感词库创建失败，请检查内容后重试。'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(list: AdminSensitiveWordListItem) {
    if (!confirmInBrowser(`确认删除敏感词库“${list.name}”？`)) {
      return;
    }

    setDeletingId(list.id);
    setMutationError(null);

    try {
      await client.adminResources.sensitiveWordLists.delete.mutate({ id: list.id });
      await refreshLists();
    } catch {
      setMutationError(`敏感词库“${list.name}”删除失败，请确认没有智能体正在引用。`);
    } finally {
      setDeletingId(null);
    }
  }

  const totalWords = lists.reduce((total, list) => total + list.words.length, 0);

  function handleDialogClose() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Resources / Sensitive Words</p>
          <h2 style={styles.heading}>敏感词库</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="敏感词库统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{lists.length}</strong>
            <span style={styles.summaryText}>个词库</span>
          </div>
          <div aria-label="敏感词总数" style={styles.summary}>
            <strong style={styles.summaryNumber}>{totalWords}</strong>
            <span style={styles.summaryText}>个词条</span>
          </div>
          <button onClick={handleCreateClick} style={styles.primaryButton} type="button">
            新建词库
          </button>
        </div>
      </header>

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

      <section aria-busy={loading} aria-label="敏感词库列表" style={styles.grid}>
        {loading ? <p style={styles.stateText}>正在加载敏感词库...</p> : null}

        {!loading && lists.length === 0 ? <p style={styles.stateText}>暂无敏感词库。</p> : null}

        {lists.map((list) => (
          <SensitiveWordListCard
            deleting={deletingId === list.id}
            item={list}
            key={list.id}
            onDelete={handleDelete}
            onEdit={handleEditClick}
          />
        ))}
      </section>

      {dialogOpen ? (
        <SensitiveWordFormDialog
          list={editingList}
          onClose={handleDialogClose}
          onSubmit={handleSubmit}
          open={dialogOpen}
          submitting={submitting}
          submitError={dialogError}
        />
      ) : null}
    </main>
  );
}

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '8px 12px',
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
  grid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
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
    fontSize: 26,
    lineHeight: '34px',
    margin: 0,
  },
  main: {
    background: '#f8fafc',
    color: '#172033',
    display: 'grid',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    gap: 18,
    minHeight: 0,
    padding: 24,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
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
