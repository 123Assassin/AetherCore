'use client';

import type {
  AdminPromptCreateInput,
  AdminPromptItem,
  AdminPromptUpdateInput,
} from '@package/shared';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { PromptCard } from '../../../../components/resources/prompt-card';
import { PromptFormDialog } from '../../../../components/resources/prompt-form-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminPromptsPage() {
  const client = useTrpcClient();
  const [prompts, setPrompts] = useState<AdminPromptItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AdminPromptItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromptItem | null>(null);
  const requestSequence = useRef(0);
  const queryRef = useRef(query);

  const fetchPrompts = useCallback(
    async (nextQuery: string) => {
      const trimmedQuery = nextQuery.trim();

      return client.adminResources.prompts.list.query({
        page: 1,
        pageSize: 100,
        ...(trimmedQuery ? { q: trimmedQuery } : {}),
      });
    },
    [client]
  );

  const refreshPrompts = useCallback(
    async (nextQuery = queryRef.current) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const nextResult = await fetchPrompts(nextQuery);

        if (requestId === requestSequence.current) {
          setPrompts(nextResult.items);
          setTotal(nextResult.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('Prompt 资源加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    },
    [fetchPrompts]
  );

  useEffect(() => {
    queryRef.current = query;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadPrompts() {
      setLoading(true);
      setError(null);

      try {
        const nextResult = await fetchPrompts(query);

        if (requestId === requestSequence.current) {
          setPrompts(nextResult.items);
          setTotal(nextResult.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('Prompt 资源加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadPrompts();
  }, [fetchPrompts, query]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  function handleCreateClick() {
    setEditingPrompt(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleEditClick(prompt: AdminPromptItem) {
    setEditingPrompt(prompt);
    setMutationError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(input: AdminPromptCreateInput) {
    setSubmitting(true);
    setMutationError(null);

    try {
      if (editingPrompt) {
        const updateInput: AdminPromptUpdateInput = {
          id: editingPrompt.id,
          ...input,
        };

        await client.adminResources.prompts.update.mutate(updateInput);
      } else {
        await client.adminResources.prompts.create.mutate(input);
      }

      await refreshPrompts();
      setDialogOpen(false);
      setEditingPrompt(null);
    } catch {
      setMutationError(
        editingPrompt
          ? 'Prompt 更新失败，请检查内容后重试。'
          : 'Prompt 创建失败，请检查内容后重试。'
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
      await client.adminResources.prompts.delete.mutate({ id: activeTarget.id });
      await refreshPrompts();
      setDeleteTarget(null);
    } catch {
      setMutationError(`Prompt“${activeTarget.title}”删除失败，请确认没有智能体正在引用。`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">AI Prompt 管理</h3>
          <p className="mt-1 text-sm text-slate-500">管理和维护系统使用的模型提示词模板版本</p>
        </div>
        <button
          className="bg-primary shadow-primary/30 hover:bg-primary-dark flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5"
          onClick={handleCreateClick}
          type="button"
        >
          <Plus size={20} />
          新建 Prompt
        </button>
      </div>

      <form
        className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end"
        onSubmit={handleSearchSubmit}
      >
        <label className="flex-1 space-y-2">
          <span className="ml-1 block text-xs font-bold tracking-widest text-slate-400 uppercase">
            搜索 Prompt
          </span>
          <div className="relative">
            <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" size={18} />
            <input
              aria-label="搜索 Prompt"
              className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-11 transition-all outline-none focus:ring-4"
              onChange={(event) => setSearchInput(readFormValue(event.currentTarget))}
              placeholder="按标题或版本搜索"
              value={searchInput}
            />
          </div>
        </label>
        <button
          className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition-colors hover:bg-slate-800"
          type="submit"
        >
          搜索
        </button>
        <button
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50"
          onClick={() => {
            setSearchInput('');
            setQuery('');
          }}
          type="button"
        >
          重置
        </button>
        <div className="text-primary rounded-2xl bg-blue-50 px-5 py-3 text-sm font-bold">
          {total} 个版本
        </div>
      </form>

      <PageMessage message={error} />
      <PageMessage message={mutationError} />

      <section
        aria-busy={loading}
        aria-label="Prompt 列表"
        className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? <EmptyState text="正在加载 Prompt..." /> : null}

        {!loading && prompts.length === 0 ? <EmptyState text="没有匹配的 Prompt。" /> : null}

        {prompts.map((prompt) => (
          <PromptCard
            deleting={deletingId === prompt.id}
            item={prompt}
            key={prompt.id}
            onDelete={setDeleteTarget}
            onEdit={handleEditClick}
          />
        ))}
      </section>

      <PromptFormDialog
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        open={dialogOpen}
        prompt={editingPrompt}
        submitting={submitting}
      />

      <DeleteDialog
        deleting={deletingId === deleteTarget?.id}
        message="删除后将无法恢复，是否确认删除该 Prompt？"
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

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}
