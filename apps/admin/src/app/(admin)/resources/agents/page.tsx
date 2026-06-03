'use client';

import type {
  AdminAgentCreateInput,
  AdminAgentItem,
  AdminAgentUpdateInput,
  AdminModelEngineItem,
  AdminPromptItem,
  AdminSensitiveWordListItem,
} from '@package/shared';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AgentCard } from '../../../../components/resources/agent-card';
import {
  AgentFormDialog,
  type AgentFormSubmitInput,
} from '../../../../components/resources/agent-form-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminAgentsPage() {
  const client = useTrpcClient();
  const [agents, setAgents] = useState<AdminAgentItem[]>([]);
  const [engines, setEngines] = useState<AdminModelEngineItem[]>([]);
  const [prompts, setPrompts] = useState<AdminPromptItem[]>([]);
  const [sensitiveWordLists, setSensitiveWordLists] = useState<AdminSensitiveWordListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AdminAgentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAgentItem | null>(null);
  const requestSequence = useRef(0);
  const queryRef = useRef(query);

  const fetchResources = useCallback(
    async (nextQuery: string) => {
      const trimmedQuery = nextQuery.trim();
      const [agentResult, promptResult, engineResult, nextSensitiveWordLists] = await Promise.all([
        client.adminResources.agents.list.query({
          page: 1,
          pageSize: 100,
          ...(trimmedQuery ? { q: trimmedQuery } : {}),
        }),
        client.adminResources.prompts.list.query({ page: 1, pageSize: 100 }),
        client.adminResources.engines.list.query(),
        client.adminResources.sensitiveWordLists.list.query(),
      ]);

      return {
        agentResult,
        engineItems: engineResult.items,
        promptItems: promptResult.items,
        sensitiveWordListItems: nextSensitiveWordLists,
      };
    },
    [client]
  );

  const refreshResources = useCallback(
    async (nextQuery = queryRef.current) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const nextResources = await fetchResources(nextQuery);

        if (requestId === requestSequence.current) {
          setAgents(nextResources.agentResult.items);
          setTotal(nextResources.agentResult.total);
          setPrompts(nextResources.promptItems);
          setEngines(nextResources.engineItems);
          setSensitiveWordLists(nextResources.sensitiveWordListItems);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('智能体资源加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    },
    [fetchResources]
  );

  useEffect(() => {
    queryRef.current = query;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadResources() {
      setLoading(true);
      setError(null);

      try {
        const nextResources = await fetchResources(query);

        if (requestId === requestSequence.current) {
          setAgents(nextResources.agentResult.items);
          setTotal(nextResources.agentResult.total);
          setPrompts(nextResources.promptItems);
          setEngines(nextResources.engineItems);
          setSensitiveWordLists(nextResources.sensitiveWordListItems);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('智能体资源加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadResources();
  }, [fetchResources, query]);

  const engineNameById = useMemo(
    () =>
      new Map(
        engines.map((engine) => [
          engine.id,
          `${engine.name} / ${getEngineProviderLabel(engine.provider)}`,
        ])
      ),
    [engines]
  );
  const promptTitleById = useMemo(
    () => new Map(prompts.map((prompt) => [prompt.id, `${prompt.title} / ${prompt.version}`])),
    [prompts]
  );
  const sensitiveListNameById = useMemo(
    () => new Map(sensitiveWordLists.map((list) => [list.id, list.name])),
    [sensitiveWordLists]
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  function handleCreateClick() {
    setEditingAgent(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function handleEditClick(agent: AdminAgentItem) {
    setEditingAgent(agent);
    setMutationError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(input: AgentFormSubmitInput) {
    setSubmitting(true);
    setMutationError(null);

    try {
      if (editingAgent) {
        const updateInput: AdminAgentUpdateInput = {
          id: editingAgent.id,
          ...input,
        };

        await client.adminResources.agents.update.mutate(updateInput);
      } else {
        await client.adminResources.agents.create.mutate(input as AdminAgentCreateInput);
      }

      await refreshResources();
      setDialogOpen(false);
      setEditingAgent(null);
    } catch {
      setMutationError(
        editingAgent ? '智能体更新失败，请检查配置后重试。' : '智能体创建失败，请检查配置后重试。'
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
      await client.adminResources.agents.delete.mutate({ id: activeTarget.id });
      await refreshResources();
      setDeleteTarget(null);
    } catch {
      setMutationError(`智能体“${activeTarget.name}”删除失败，请稍后重试。`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">智能体管理</h3>
          <p className="mt-1 text-sm text-slate-500">
            管理并监控当前运行的 AI 智能体实例与模型调用
          </p>
        </div>
        <button
          className="bg-primary shadow-primary/30 hover:bg-primary-dark flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0.5"
          onClick={handleCreateClick}
          type="button"
        >
          <Plus size={20} />
          新增智能体
        </button>
      </div>

      <form
        className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end"
        onSubmit={handleSearchSubmit}
      >
        <label className="flex-1 space-y-2">
          <span className="ml-1 block text-xs font-bold tracking-widest text-slate-400 uppercase">
            搜索智能体
          </span>
          <div className="relative">
            <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" size={18} />
            <input
              aria-label="搜索智能体"
              className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-11 transition-all outline-none focus:ring-4"
              onChange={(event) => setSearchInput(readFormValue(event.currentTarget))}
              placeholder="按名称、Key、年级或学科搜索"
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
          {total} 个智能体
        </div>
      </form>

      <PageMessage message={error} />
      <PageMessage message={mutationError} />

      <section
        aria-busy={loading}
        aria-label="智能体列表"
        className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? <EmptyState text="正在加载智能体..." /> : null}

        {!loading && agents.length === 0 ? <EmptyState text="没有匹配的智能体。" /> : null}

        {agents.map((agent) => (
          <AgentCard
            deleting={deletingId === agent.id}
            engineName={engineNameById.get(agent.engineId) ?? '未找到模型引擎'}
            item={agent}
            key={agent.id}
            onDelete={setDeleteTarget}
            onEdit={handleEditClick}
            promptTitle={
              agent.promptId ? (promptTitleById.get(agent.promptId) ?? '未找到 Prompt') : '不绑定'
            }
            sensitiveListName={
              agent.sensitiveListId
                ? (sensitiveListNameById.get(agent.sensitiveListId) ?? '未找到敏感词库')
                : '不绑定'
            }
          />
        ))}
      </section>

      <AgentFormDialog
        agent={editingAgent}
        engines={engines}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        open={dialogOpen}
        prompts={prompts}
        sensitiveWordLists={sensitiveWordLists}
        submitting={submitting}
      />

      <DeleteDialog
        deleting={deletingId === deleteTarget?.id}
        message="删除后将无法恢复该智能体，是否确认删除？"
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

function getEngineProviderLabel(provider: AdminModelEngineItem['provider']): string {
  if (provider === 'custom') {
    return '模型 API 调用';
  }

  return provider;
}
