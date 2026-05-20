'use client';

import type {
  AdminAuditExportResult,
  AdminContentAuditItem,
  AdminContentAuditListInput,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { ContentAuditTable } from '../../../../components/security/content-audit-table';
import {
  type ExportCsvDateRange,
  ExportCsvDialog,
} from '../../../../components/security/export-csv-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminContentAuditPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminContentAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequence = useRef(0);

  const fetchContentAudit = useCallback(
    (input: AdminContentAuditListInput) => {
      return client.adminOperations.contentAudit.list.query(input);
    },
    [client]
  );

  const refreshContentAudit = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchContentAudit({ page: 1, pageSize: 100 });

      if (requestId === requestSequence.current) {
        setItems(result.items);
        setTotal(result.total);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('AI 内容审计列表加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchContentAudit]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadContentAudit() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchContentAudit({ page: 1, pageSize: 100 });

        if (requestId === requestSequence.current) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('AI 内容审计列表加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadContentAudit();
  }, [fetchContentAudit]);

  async function handleExport(range: ExportCsvDateRange) {
    if (exporting) {
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const result = await client.adminOperations.contentAudit.export.mutate(range);
      const downloaded = triggerCsvDownload(result);

      setExportMessage(
        downloaded ? `已导出 ${result.filename}。` : `CSV 已生成：${result.filename}`
      );
      setExportOpen(false);
    } catch {
      setExportError('AI 内容审计导出失败，请稍后重试。');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(item: AdminContentAuditItem) {
    if (item.isDeleted || deletingIds.has(item.id)) {
      return;
    }

    if (!confirmInBrowser(`确认软删除会话“${item.title}”？`)) {
      return;
    }

    setDeletingIds((current) => new Set(current).add(item.id));
    setMutationError(null);

    try {
      await client.adminOperations.contentAudit.delete.mutate({ id: item.id });
    } catch {
      setMutationError(`会话“${item.title}”软删除失败，请稍后重试。`);
      await refreshContentAudit();
      return;
    } finally {
      setDeletingIds((current) => deletePendingId(current, item.id));
    }

    await refreshContentAudit();
  }

  function openExportDialog() {
    setExportError(null);
    setExportMessage(null);
    setExportOpen(true);
  }

  const deletedCount = items.filter((item) => item.isDeleted).length;
  const activeCount = items.length - deletedCount;

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Security / Content Audit</p>
          <h2 style={styles.heading}>AI 内容审计</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="AI 内容审计统计" style={styles.summary}>
            <strong style={styles.summaryNumber}>{loading ? '...' : total}</strong>
            <span style={styles.summaryText}>条结果</span>
          </div>
          <button
            disabled={loading || exporting}
            onClick={openExportDialog}
            style={styles.secondaryButton}
            type="button"
          >
            导出 CSV
          </button>
        </div>
      </header>

      <section aria-label="AI 内容审计状态统计" style={styles.statusSummary}>
        <span style={styles.filterStat}>活跃 {loading ? '...' : activeCount}</span>
        <span style={styles.filterStat}>已删除标记 {loading ? '...' : deletedCount}</span>
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

      {exportMessage ? (
        <p aria-live="polite" style={styles.success}>
          {exportMessage}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="AI 内容审计列表" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载 AI 内容审计列表...</p> : null}

        {!loading && items.length === 0 ? (
          <p style={styles.stateText}>暂无 AI 内容审计记录。</p>
        ) : null}

        {!loading && items.length > 0 ? (
          <ContentAuditTable deletingIds={deletingIds} items={items} onDelete={handleDelete} />
        ) : null}
      </section>

      {exportOpen ? (
        <ExportCsvDialog
          description="可选开始日期和结束日期，留空则导出全部可查询记录。"
          onClose={() => setExportOpen(false)}
          onSubmit={handleExport}
          open={exportOpen}
          submitError={exportError}
          submitting={exporting}
          title="导出 AI 内容审计 CSV"
        />
      ) : null}
    </main>
  );
}

function triggerCsvDownload(result: AdminAuditExportResult): boolean {
  type DownloadAnchor = {
    click: () => void;
    download: string;
    href: string;
    style: {
      display: string;
    };
  };
  const browserGlobal = globalThis as typeof globalThis & {
    Blob?: typeof Blob;
    URL?: typeof URL;
    document?: {
      body?: {
        appendChild: (node: unknown) => void;
        removeChild: (node: unknown) => void;
      };
      createElement?: (tagName: 'a') => DownloadAnchor;
    };
  };

  if (
    !browserGlobal.Blob ||
    !browserGlobal.URL?.createObjectURL ||
    !browserGlobal.URL.revokeObjectURL ||
    !browserGlobal.document?.createElement
  ) {
    return false;
  }

  const link = browserGlobal.document.createElement('a');
  const blob = new browserGlobal.Blob([result.content], { type: result.contentType });
  const url = browserGlobal.URL.createObjectURL(blob);

  try {
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';
    browserGlobal.document.body?.appendChild(link);
    link.click();
    browserGlobal.document.body?.removeChild(link);
  } finally {
    browserGlobal.URL.revokeObjectURL(url);
  }

  return true;
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
  filterStat: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 999,
    color: '#334155',
    fontSize: 12,
    lineHeight: '16px',
    padding: '4px 8px',
    whiteSpace: 'nowrap',
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
  main: {
    display: 'grid',
    gap: 16,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
    minHeight: 40,
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
  statusSummary: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  success: {
    background: '#ecfdf5',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    color: '#166534',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
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
