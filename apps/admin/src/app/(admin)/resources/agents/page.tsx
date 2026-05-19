'use client';

import type {
  AdminAgentCreateInput,
  AdminAgentItem,
  AdminAgentUpdateInput,
  AdminModelEngineItem,
  AdminPromptItem,
  AdminSensitiveWordListItem,
} from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AgentCard } from '../../../../components/resources/agent-card';
import { AgentFormDialog } from '../../../../components/resources/agent-form-dialog';
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
    () => new Map(engines.map((engine) => [engine.id, `${engine.name} / ${engine.provider}`])),
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

  async function handleSubmit(input: AdminAgentCreateInput) {
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
        await client.adminResources.agents.create.mutate(input);
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

  async function handleDelete(agent: AdminAgentItem) {
    if (!confirmInBrowser(`确认删除智能体“${agent.name}”？`)) {
      return;
    }

    setDeletingId(agent.id);
    setMutationError(null);

    try {
      await client.adminResources.agents.delete.mutate({ id: agent.id });
      await refreshResources();
    } catch {
      setMutationError(`智能体“${agent.name}”删除失败，请稍后重试。`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Resources / Agents</p>
          <h2 style={styles.heading}>智能体管理</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="智能体统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{total}</strong>
            <span style={styles.summaryText}>个智能体</span>
          </div>
          <button onClick={handleCreateClick} style={styles.primaryButton} type="button">
            新建智能体
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

      <form onSubmit={handleSearchSubmit} style={styles.toolbar}>
        <label style={styles.searchLabel}>
          <span style={styles.labelText}>搜索智能体</span>
          <input
            aria-label="搜索智能体"
            onChange={(event) => setSearchInput(readFormValue(event.currentTarget))}
            placeholder="按名称或 Key 搜索"
            style={styles.searchInput}
            value={searchInput}
          />
        </label>
        <button style={styles.secondaryButton} type="submit">
          搜索
        </button>
        <button
          onClick={() => {
            setSearchInput('');
            setQuery('');
          }}
          style={styles.secondaryButton}
          type="button"
        >
          重置
        </button>
      </form>

      <section aria-busy={loading} aria-label="智能体列表" style={styles.grid}>
        {loading ? <p style={styles.stateText}>正在加载智能体...</p> : null}

        {!loading && agents.length === 0 ? (
          <p style={styles.stateText}>没有匹配的智能体。</p>
        ) : null}

        {agents.map((agent) => (
          <AgentCard
            deleting={deletingId === agent.id}
            engineName={engineNameById.get(agent.engineId) ?? '未找到模型引擎'}
            item={agent}
            key={agent.id}
            onDelete={handleDelete}
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
  labelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
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
  searchInput: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 38,
    padding: '8px 10px',
    width: 'min(100%, 320px)',
  },
  searchLabel: {
    display: 'grid',
    gap: 6,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
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
  toolbar: {
    alignItems: 'end',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
} satisfies Record<string, CSSProperties>;

function confirmInBrowser(message: string): boolean {
  const browserGlobal = globalThis as typeof globalThis & {
    confirm?: (message?: string) => boolean;
  };

  return browserGlobal.confirm?.(message) ?? false;
}

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}
