'use client';

import type {
  AdminAuditExportResult,
  AdminSystemAuditItem,
  AdminSystemAuditListInput,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { AuditLogTable } from '../../../../components/security/audit-log-table';
import {
  type ExportCsvDateRange,
  ExportCsvDialog,
} from '../../../../components/security/export-csv-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminSystemAuditPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminSystemAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const requestSequence = useRef(0);

  const fetchAuditLogs = useCallback(
    (input: AdminSystemAuditListInput) => {
      return client.adminOperations.systemAudit.list.query(input);
    },
    [client]
  );

  const refreshAuditLogs = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAuditLogs({ page: 1, pageSize: 100 });

      if (requestId === requestSequence.current) {
        setItems(result.items);
        setTotal(result.total);
      }
    } catch {
      if (requestId === requestSequence.current) {
        setError('系统审计日志加载失败，请确认管理员会话和服务状态。');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [fetchAuditLogs]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadAuditLogs() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAuditLogs({ page: 1, pageSize: 100 });

        if (requestId === requestSequence.current) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('系统审计日志加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadAuditLogs();
  }, [fetchAuditLogs]);

  async function handleExport(range: ExportCsvDateRange) {
    if (exporting) {
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const result = await client.adminOperations.systemAudit.export.mutate(range);
      const downloaded = triggerCsvDownload(result);

      setExportMessage(
        downloaded ? `已导出 ${result.filename}。` : `CSV 已生成：${result.filename}`
      );
      setExportOpen(false);
      await refreshAuditLogs();
    } catch {
      setExportError('系统审计日志导出失败，请稍后重试。');
    } finally {
      setExporting(false);
    }
  }

  function openExportDialog() {
    setExportError(null);
    setExportMessage(null);
    setExportOpen(true);
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Security / System Audit</p>
          <h2 style={styles.heading}>系统审计日志</h2>
        </div>
        <div style={styles.headerActions}>
          <div aria-label="系统审计统计" style={styles.summary}>
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

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      {exportMessage ? (
        <p aria-live="polite" style={styles.success}>
          {exportMessage}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="系统审计日志列表" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载系统审计日志...</p> : null}

        {!loading && items.length === 0 ? <p style={styles.stateText}>暂无系统审计日志。</p> : null}

        {!loading && items.length > 0 ? <AuditLogTable items={items} /> : null}
      </section>

      {exportOpen ? (
        <ExportCsvDialog
          description="可选开始日期和结束日期，留空则导出全部可查询记录。"
          onClose={() => setExportOpen(false)}
          onSubmit={handleExport}
          open={exportOpen}
          submitError={exportError}
          submitting={exporting}
          title="导出系统审计 CSV"
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
