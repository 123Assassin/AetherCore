'use client';

import type {
  AdminModelEngineCreateInput,
  AdminModelEngineItem,
  AdminModelEngineUpdateInput,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import {
  EngineFormDialog,
  type EngineFormSubmitInput,
} from '../../../components/engines/engine-form-dialog';
import { EngineTable } from '../../../components/engines/engine-table';
import { useTrpcClient } from '../../../trpc/provider';

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
  const requestSequence = useRef(0);

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

  async function handleDelete(engine: AdminModelEngineItem) {
    if (!confirmInBrowser(`确认删除模型引擎“${engine.name}”？`)) {
      return;
    }

    setDeletingId(engine.id);
    setMutationError(null);

    try {
      await client.adminResources.engines.delete.mutate({ id: engine.id });
      await refreshEngines();
    } catch {
      setMutationError(`模型引擎“${engine.name}”删除失败，请确认没有智能体正在引用。`);
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
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Operations / Engine Dispatch</p>
          <h2 style={styles.heading}>模型引擎调度</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="模型引擎统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{engines.length}</strong>
            <span style={styles.summaryText}>个引擎</span>
          </div>
          <div aria-label="启用模型引擎统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{enabledCount}</strong>
            <span style={styles.summaryText}>个启用</span>
          </div>
          <button onClick={handleCreateClick} style={styles.primaryButton} type="button">
            新建引擎
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

      <section aria-busy={loading} aria-label="模型引擎列表" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载模型引擎...</p> : null}

        {!loading && engines.length === 0 ? <p style={styles.stateText}>暂无模型引擎。</p> : null}

        {!loading && engines.length > 0 ? (
          <EngineTable
            deletingId={deletingId}
            items={engines}
            onDelete={handleDelete}
            onEdit={handleEditClick}
          />
        ) : null}
      </section>

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
  section: {
    display: 'grid',
    gap: 12,
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
