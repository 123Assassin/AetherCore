'use client';

import type {
  AdminAuditExportResult,
  AdminContentAuditDetail,
  AdminContentAuditItem,
  AdminContentAuditListInput,
} from '@package/shared';
import { AlertTriangle, Download, X } from 'lucide-react';
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentAuditTable } from '../../../../components/security/content-audit-table';
import {
  type ExportCsvDateRange,
  ExportCsvDialog,
} from '../../../../components/security/export-csv-dialog';
import { useTrpcClient } from '../../../../trpc/provider';

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

export default function AdminContentAuditPage() {
  const client = useTrpcClient();
  const [items, setItems] = useState<AdminContentAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<AdminContentAuditItem | null>(null);
  const [detail, setDetail] = useState<AdminContentAuditDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminContentAuditItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestSequence = useRef(0);
  const detailRequestSequence = useRef(0);

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

  async function handleConfirmDelete() {
    if (!deleteTarget || deleteTarget.isDeleted || deletingIds.has(deleteTarget.id)) {
      return;
    }

    const item = deleteTarget;

    setDeletingIds((current) => new Set(current).add(item.id));
    setDeleteError(null);

    try {
      await client.adminOperations.contentAudit.delete.mutate({ id: item.id });
      setDeleteTarget(null);
      setDeleteError(null);
    } catch {
      setDeleteError(`会话“${item.title}”软删除失败，请稍后重试。`);
      await refreshContentAudit();
      return;
    } finally {
      setDeletingIds((current) => deletePendingId(current, item.id));
    }

    await refreshContentAudit();
  }

  async function handleViewDetail(item: AdminContentAuditItem) {
    const requestId = detailRequestSequence.current + 1;
    detailRequestSequence.current = requestId;

    setDetailTarget(item);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const result = await client.adminOperations.contentAudit.detail.query({ id: item.id });

      if (requestId === detailRequestSequence.current) {
        setDetail(result);
      }
    } catch {
      if (requestId === detailRequestSequence.current) {
        setDetailError('会话详情加载失败，请稍后重试。');
      }
    } finally {
      if (requestId === detailRequestSequence.current) {
        setDetailLoading(false);
      }
    }
  }

  function closeDetailDialog() {
    detailRequestSequence.current += 1;
    setDetailTarget(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteError(null);
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">AI 内容审计</h1>
          <p className="mt-1 text-sm text-slate-500">按会话监控用户与 AI 之间的交互记录</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || exporting}
          onClick={openExportDialog}
          type="button"
        >
          <Download aria-hidden="true" size={20} />
          导出记录 (CSV)
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

      <section aria-busy={loading} aria-label="AI 内容审计列表">
        {loading ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            正在加载 AI 内容审计列表...
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            暂无 AI 内容审计记录。
          </p>
        ) : null}

        {!loading && items.length > 0 ? (
          <ContentAuditTable
            deletingIds={deletingIds}
            items={items}
            onDelete={(item) => setDeleteTarget(item)}
            onViewDetail={handleViewDetail}
          />
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
          title="导出记录"
        />
      ) : null}

      {deleteTarget ? (
        <DeleteContentAuditDialog
          error={deleteError}
          item={deleteTarget}
          onClose={closeDeleteDialog}
          onConfirm={handleConfirmDelete}
          submitting={deletingIds.has(deleteTarget.id)}
        />
      ) : null}

      {detailTarget ? (
        <ContentAuditDetailDialog
          detail={detail}
          error={detailError}
          fallback={detailTarget}
          loading={detailLoading}
          onClose={closeDetailDialog}
        />
      ) : null}
    </main>
  );
}

function ContentAuditDetailDialog({
  detail,
  error,
  fallback,
  loading,
  onClose,
}: {
  detail: AdminContentAuditDetail | null;
  error: string | null;
  fallback: AdminContentAuditItem;
  loading: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<FocusableDialogElement | null>(null);
  const openerRef = useRef<FocusableElement | null>(null);
  const titleId = 'content-audit-detail-title';
  const descriptionId = 'content-audit-detail-description';
  const item = detail ?? fallback;

  useEffect(() => {
    openerRef.current = getActiveFocusableElement();
    focusFirstDialogControl(dialogRef.current);

    return () => {
      openerRef.current?.focus();
    };
  }, []);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl space-y-6 overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl"
        onKeyDown={(event) => handleDialogKeyDown(event, onClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-bold text-slate-800" id={titleId}>
              会话详情
            </h2>
            <p className="truncate text-sm text-slate-500" id={descriptionId}>
              {item.title} / {item.conversationId}
            </p>
          </div>
          <button
            aria-label="关闭会话详情"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={24} />
          </button>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            正在加载会话详情...
          </p>
        ) : null}

        {error ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailField label="用户" value={item.userEmail} />
          <DetailField label="用户 ID" value={item.userId ?? '无 userId'} />
          <DetailField label="分类" value={categoryLabels[item.category]} />
          <DetailField label="消息数" value={`${item.messageCount} 条`} />
          <DetailField
            label="最后交互时间"
            value={item.lastMessageAt ? formatDateTime(item.lastMessageAt) : '暂无记录'}
          />
          <DetailField label="状态" value={item.isDeleted ? '已删除 (标记)' : '活跃'} />
          <DetailField label="创建时间" value={formatDateTime(item.createdAt)} />
          <DetailField label="更新时间" value={formatDateTime(item.updatedAt)} />
        </div>

        {item.metadata ? (
          <section aria-label="会话元数据" className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">元数据</h3>
            <pre className="max-h-40 overflow-auto rounded-2xl bg-slate-50 p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-500">
              {formatMetadata(item.metadata)}
            </pre>
          </section>
        ) : null}

        <section aria-label="审计消息" className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700">消息记录</h3>
          {detail && detail.messages.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              暂无消息记录。
            </p>
          ) : null}
          {detail?.messages.map((message) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              key={message.id}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                  {roleLabels[message.role]}
                </span>
                <time className="font-mono text-xs text-slate-400">
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              <p className="text-sm leading-6 whitespace-pre-wrap text-slate-600">
                {message.content}
              </p>
            </article>
          ))}
        </section>
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-sm font-bold break-words text-slate-700">{value}</div>
    </div>
  );
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMetadata(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '元数据无法显示';
  }
}

const categoryLabels: Record<AdminContentAuditItem['category'], string> = {
  chat: '对话',
  comment: '评论',
  inspiration: '灵感',
  teaching: '教学',
};

const roleLabels: Record<AdminContentAuditDetail['messages'][number]['role'], string> = {
  assistant: 'AI',
  system: '系统',
  user: '用户',
};

function DeleteContentAuditDialog({
  error,
  item,
  onClose,
  onConfirm,
  submitting,
}: {
  error: string | null;
  item: AdminContentAuditItem;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const dialogRef = useRef<FocusableDialogElement | null>(null);
  const openerRef = useRef<FocusableElement | null>(null);
  const titleId = 'content-audit-delete-title';
  const descriptionId = 'content-audit-delete-description';

  useEffect(() => {
    openerRef.current = getActiveFocusableElement();
    focusFirstDialogControl(dialogRef.current);

    return () => {
      openerRef.current?.focus();
    };
  }, []);

  function handleClose() {
    if (!submitting) {
      onClose();
    }
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 text-center shadow-2xl"
        onKeyDown={(event) => handleDialogKeyDown(event, handleClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle aria-hidden="true" size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800" id={titleId}>
            确认删除
          </h2>
          <p className="text-sm text-slate-500" id={descriptionId}>
            删除后会话“{item.title}”将被标记为已删除，是否确认删除？
          </p>
        </div>
        {error ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="flex gap-4 pt-4">
          <button
            className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={handleClose}
            type="button"
          >
            取消
          </button>
          <button
            className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={onConfirm}
            type="button"
          >
            {submitting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </section>
    </div>
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

function deletePendingId(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);

  next.delete(id);

  return next;
}

function handleDialogKeyDown(event: KeyboardEvent, onClose: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

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

function getActiveFocusableElement(): FocusableElement | null {
  const activeElement = (globalThis as BrowserFocusGlobal).document?.activeElement;

  if (!activeElement || typeof (activeElement as FocusableElement).focus !== 'function') {
    return null;
  }

  return activeElement as FocusableElement;
}

function getFocusableElements(container: FocusableDialogElement): FocusableElement[] {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
}
