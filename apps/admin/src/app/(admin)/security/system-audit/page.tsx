'use client';

import type {
  AdminAuditExportResult,
  AdminSystemAuditItem,
  AdminSystemAuditListInput,
} from '@package/shared';
import { Download, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AuditLogTable } from '../../../../components/security/audit-log-table';
import {
  type ExportCsvDateRange,
  ExportCsvDialog,
} from '../../../../components/security/export-csv-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

export default function AdminSystemAuditPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminSystemAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminSystemAuditItem | null>(null);
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
    <main className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">系统审计日志</h1>
          <p className="mt-1 text-sm text-slate-500">监控系统内的操作记录与安全事件</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || exporting}
          onClick={openExportDialog}
          type="button"
        >
          <Download aria-hidden="true" size={20} />
          导出日志 (CSV)
        </button>
      </header>

      {error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {exportMessage ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-600"
        >
          {exportMessage}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="系统审计日志列表">
        {loading ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            正在加载系统审计日志...
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            暂无系统审计日志。
          </p>
        ) : null}

        {!loading && items.length > 0 ? (
          <AuditLogTable items={items} onViewDetails={setSelectedItem} />
        ) : null}
      </section>

      {selectedItem ? (
        <AuditDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}

      {exportOpen ? (
        <ExportCsvDialog
          description="可选开始日期和结束日期，留空则导出全部可查询记录。"
          onClose={() => setExportOpen(false)}
          onSubmit={handleExport}
          open={exportOpen}
          submitError={exportError}
          submitting={exporting}
          title="导出记录"
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

function AuditDetailDialog({ item, onClose }: { item: AdminSystemAuditItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">审计日志详情</h2>
            <p className="mt-1 font-mono text-xs text-slate-400">{item.logId}</p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="发生时间" value={formatAuditTimestamp(item.timestamp)} />
            <DetailField label="事件级别" value={item.level === 0 ? '告警' : '信息'} />
            <DetailField label="日志类型" value={String(item.logType)} />
            <DetailField label="API 路由" value={getDetailString(item.details, 'apiRoute')} />
            <DetailField label="操作模块" value={getDetailString(item.details, 'module')} />
            <DetailField label="操作账号" value={getDetailString(item.details, 'actorAccount')} />
            <DetailField label="操作人ID" value={getDetailString(item.details, 'actorId')} />
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
              事件内容
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 whitespace-pre-wrap text-slate-100">
              {formatJson(item.details)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold break-all text-slate-700">
        {value || '未记录'}
      </div>
    </div>
  );
}

function formatAuditTimestamp(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  return new Date(value * 1000).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDetailString(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];

  return typeof value === 'string' && value ? value : null;
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '详情无法显示';
  }
}
