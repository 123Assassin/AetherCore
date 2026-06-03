'use client';

import type {
  AdminSensitiveWordListCreateInput,
  AdminSensitiveWordListItem,
  AdminSensitiveWordListUpdateInput,
} from '@package/shared';
import { AlertTriangle, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [deleteTarget, setDeleteTarget] = useState<AdminSensitiveWordListItem | null>(null);
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

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const activeTarget = deleteTarget;
    setDeletingId(activeTarget.id);
    setMutationError(null);

    try {
      await client.adminResources.sensitiveWordLists.delete.mutate({ id: activeTarget.id });
      await refreshLists();
      setDeleteTarget(null);
    } catch {
      setMutationError(`敏感词库“${activeTarget.name}”删除失败，请确认没有智能体正在引用。`);
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">敏感词库管理</h3>
          <p className="mt-1 text-sm text-slate-500">管理敏感词过滤规则，确保生成内容合规</p>
        </div>
        <button
          className="bg-primary shadow-primary/30 hover:bg-primary-dark flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5"
          onClick={handleCreateClick}
          type="button"
        >
          <Plus size={20} />
          新建词库
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <strong className="text-primary mr-2 text-xl font-black">{lists.length}</strong>
          <span className="text-sm font-bold text-slate-500">个词库</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <strong className="text-primary mr-2 text-xl font-black">{totalWords}</strong>
          <span className="text-sm font-bold text-slate-500">个词条</span>
        </div>
      </div>

      <PageMessage message={error} />
      <PageMessage message={mutationError} />

      <section
        aria-busy={loading}
        aria-label="敏感词库列表"
        className="grid grid-cols-1 gap-8 md:grid-cols-2"
      >
        {loading ? <EmptyState text="正在加载敏感词库..." /> : null}

        {!loading && lists.length === 0 ? <EmptyState text="暂无敏感词库。" /> : null}

        {lists.map((list) => (
          <SensitiveWordListCard
            deleting={deletingId === list.id}
            item={list}
            key={list.id}
            onDelete={setDeleteTarget}
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

      <DeleteDialog
        deleting={deletingId === deleteTarget?.id}
        message="删除后将无法恢复，是否确认删除该敏感词库？"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        open={Boolean(deleteTarget)}
        title="确认删除"
      />
    </div>
  );
}

function PageMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
      role="alert"
    >
      {message}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
      {text}
    </p>
  );
}

function DeleteDialog({
  deleting,
  message,
  onClose,
  onConfirm,
  open,
  title,
}: {
  deleting: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={deleting ? undefined : onClose}
          />
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 text-center shadow-2xl"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{message}</p>
            <div className="flex gap-4 pt-4">
              <button
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleting}
                onClick={onClose}
                type="button"
              >
                取消
              </button>
              <button
                className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleting}
                onClick={onConfirm}
                type="button"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
