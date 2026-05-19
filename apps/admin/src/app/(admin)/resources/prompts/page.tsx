'use client';

import type {
  AdminPromptCreateInput,
  AdminPromptItem,
  AdminPromptUpdateInput,
} from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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

  async function handleDelete(prompt: AdminPromptItem) {
    if (!confirmInBrowser(`确认删除 Prompt“${prompt.title} / ${prompt.version}”？`)) {
      return;
    }

    setDeletingId(prompt.id);
    setMutationError(null);

    try {
      await client.adminResources.prompts.delete.mutate({ id: prompt.id });
      await refreshPrompts();
    } catch {
      setMutationError(`Prompt“${prompt.title}”删除失败，请确认没有智能体正在引用。`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Resources / Prompts</p>
          <h2 style={styles.heading}>AI Prompt 管理</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="Prompt 统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{total}</strong>
            <span style={styles.summaryText}>个版本</span>
          </div>
          <button onClick={handleCreateClick} style={styles.primaryButton} type="button">
            新建 Prompt
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
          <span style={styles.labelText}>搜索 Prompt</span>
          <input
            aria-label="搜索 Prompt"
            onChange={(event) => setSearchInput(readFormValue(event.currentTarget))}
            placeholder="按标题或版本搜索"
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

      <section aria-busy={loading} aria-label="Prompt 列表" style={styles.grid}>
        {loading ? <p style={styles.stateText}>正在加载 Prompt...</p> : null}

        {!loading && prompts.length === 0 ? (
          <p style={styles.stateText}>没有匹配的 Prompt。</p>
        ) : null}

        {prompts.map((prompt) => (
          <PromptCard
            deleting={deletingId === prompt.id}
            item={prompt}
            key={prompt.id}
            onDelete={handleDelete}
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
