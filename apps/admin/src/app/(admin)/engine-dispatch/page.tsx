'use client';

import type {
  AdminModelEngineCreateInput,
  AdminModelEngineItem,
  AdminModelEngineUpdateInput,
} from '@package/shared';
import { AlertTriangle, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  EngineFormDialog,
  type EngineFormSubmitInput,
} from '../../../components/engines/engine-form-dialog';
import { EngineTable } from '../../../components/engines/engine-table';
import { useTrpcClient } from '../../../trpc/provider';

type FocusableElement = {
  focus: () => void;
  offsetParent: unknown | null;
};

type FocusableDialogElement = FocusableElement & {
  querySelectorAll: (selector: string) => ArrayLike<FocusableElement>;
};

type BrowserFocusGlobal = typeof globalThis & {
  document?: {
    activeElement?: unknown;
  };
};

const deleteDialogTitleId = 'engine-delete-dialog-title';

export default function AdminEngineDispatchPage() {
  const client = useTrpcClient();
  const [engines, setEngines] = useState<AdminModelEngineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngine, setEditingEngine] = useState<AdminModelEngineItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminModelEngineItem | null>(null);
  const requestSequence = useRef(0);
  const deleteDialogRef = useRef<FocusableDialogElement | null>(null);

  const fetchEngines = useCallback(async () => {
    const result = await client.adminResources.engines.list.query();

    return result.items;
  }, [client]);

  const refreshEngines = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const nextEngines = await fetchEngines();

      if (requestId === requestSequence.current) {
        setEngines(nextEngines);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('模型引擎加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchEngines]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadEngines() {
      setLoading(true);
      setError(null);

      try {
        const nextEngines = await fetchEngines();

        if (requestId === requestSequence.current) {
          setEngines(nextEngines);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('模型引擎加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadEngines();
  }, [fetchEngines]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }

    focusFirstDialogControl(deleteDialogRef.current);
  }, [deleteTarget]);

  function handleCreateClick() {
    setEditingEngine(null);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleEditClick(engine: AdminModelEngineItem) {
    setEditingEngine(engine);
    setDialogError(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(input: EngineFormSubmitInput) {
    const activeEngine = editingEngine;

    setSubmitting(true);
    setDialogError(null);
    setMutationError(null);

    try {
      if (activeEngine) {
        const updateInput: AdminModelEngineUpdateInput = {
          id: activeEngine.id,
          ...input,
        };

        await client.adminResources.engines.update.mutate(updateInput);
      } else {
        const { apiKey, ...restInput } = input;

        if (!apiKey) {
          setDialogError('模型引擎创建失败，请填写 API Key。');
          return;
        }

        const createInput: AdminModelEngineCreateInput = {
          ...restInput,
          apiKey,
        };

        await client.adminResources.engines.create.mutate(createInput);
      }

      await refreshEngines();
      setDialogOpen(false);
      setEditingEngine(null);
      setDialogError(null);
    } catch {
      setDialogError(
        activeEngine
          ? '模型引擎更新失败，请检查配置后重试。'
          : '模型引擎创建失败，请检查配置后重试。'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteClick(engine: AdminModelEngineItem) {
    if (deletingId) {
      return;
    }

    setMutationError(null);
    setDeleteTarget(engine);
  }

  function handleDeleteModalClose() {
    if (deletingId) {
      return;
    }

    setDeleteTarget(null);
  }

  function handleDeleteDialogKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleDeleteModalClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    trapDialogFocus(event);
  }

  async function handleConfirmDelete() {
    const activeTarget = deleteTarget;

    if (!activeTarget || deletingId) {
      return;
    }

    setDeletingId(activeTarget.id);
    setMutationError(null);

    try {
      await client.adminResources.engines.delete.mutate({ id: activeTarget.id });
      await refreshEngines();
      setDeleteTarget(null);
    } catch {
      setMutationError(`模型引擎“${activeTarget.name}”删除失败，请确认没有智能体正在引用。`);
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  const enabledCount = engines.filter((engine) => engine.status === 'enabled').length;

  function handleDialogClose() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
  }

  return (
    <main className="space-y-8">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">引擎调度中心</h3>
          <p className="mt-1 text-sm text-slate-500">配置与管理各 AI 模型引擎节点的地址及密钥</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            aria-label="模型引擎统计"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <strong className="text-primary text-xl leading-none">
              {loading ? '...' : engines.length}
            </strong>
            <span className="ml-1 text-xs font-bold text-slate-400">个引擎</span>
          </div>
          <div
            aria-label="启用模型引擎统计"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <strong className="text-primary text-xl leading-none">
              {loading ? '...' : enabledCount}
            </strong>
            <span className="ml-1 text-xs font-bold text-slate-400">个启用</span>
          </div>
          <button
            className="bg-primary hover:bg-primary-dark shadow-primary/30 flex items-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5"
            onClick={handleCreateClick}
            type="button"
          >
            <Plus size={20} />
            新增模型引擎
          </button>
        </div>
      </header>

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

      <section aria-busy={loading} aria-label="模型引擎列表" className="space-y-4">
        {loading ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
            正在加载模型引擎...
          </p>
        ) : null}

        {!loading && engines.length === 0 ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
            暂无模型引擎。
          </p>
        ) : null}

        {!loading && engines.length > 0 ? (
          <EngineTable
            deletingId={deletingId}
            items={engines}
            onDelete={handleDeleteClick}
            onEdit={handleEditClick}
          />
        ) : null}
      </section>

      <AnimatePresence>
        {dialogOpen ? (
          <EngineFormDialog
            engine={editingEngine}
            onClose={handleDialogClose}
            onSubmit={handleSubmit}
            open={dialogOpen}
            submitting={submitting}
            submitError={dialogError}
          />
        ) : null}

        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={handleDeleteModalClose}
            />
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              aria-labelledby={deleteDialogTitleId}
              aria-modal="true"
              className="relative w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 text-center shadow-2xl"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              onKeyDown={handleDeleteDialogKeyDown}
              ref={(element) => {
                deleteDialogRef.current = element as FocusableDialogElement | null;
              }}
              role="dialog"
              tabIndex={-1}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800" id={deleteDialogTitleId}>
                确认删除
              </h3>
              <p className="text-sm text-slate-500">
                删除后将影响依赖此引擎的智能体，是否确认删除？
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(deletingId)}
                  onClick={handleDeleteModalClose}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(deletingId)}
                  onClick={handleConfirmDelete}
                  type="button"
                >
                  {deletingId === deleteTarget.id ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function trapDialogFocus(event: KeyboardEvent) {
  const dialogElement = event.currentTarget as unknown as FocusableDialogElement;
  const focusableElements = getFocusableElements(dialogElement);

  if (focusableElements.length === 0) {
    event.preventDefault();
    dialogElement.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = (globalThis as BrowserFocusGlobal).document?.activeElement;

  if (event.shiftKey && (activeElement === firstElement || activeElement === dialogElement)) {
    event.preventDefault();
    lastElement?.focus();
    return;
  }

  if (!event.shiftKey && (activeElement === lastElement || activeElement === dialogElement)) {
    event.preventDefault();
    firstElement?.focus();
  }
}

function focusFirstDialogControl(container: FocusableDialogElement | null) {
  if (!container) {
    return;
  }

  getFocusableElements(container)[0]?.focus();
}

function getFocusableElements(container: FocusableDialogElement): FocusableElement[] {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
}
