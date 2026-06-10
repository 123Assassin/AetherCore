'use client';

import { AlertTriangle, CalendarClock, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

type CleanupFormState = {
  endDate: string;
  retentionDays: string;
  startDate: string;
};

type CleanupFormError = {
  field: keyof CleanupFormState;
  message: string;
};

type CleanupSuccess = {
  message: string;
  scope: 'auto' | 'manual';
};

type ManualCleanupRange = {
  endDate: Date;
  startDate: Date;
};

type DateTimeInputElement = HTMLInputElement & {
  disabled?: boolean;
  focus?: () => void;
  showPicker?: () => void;
};

const emptyForm: CleanupFormState = {
  endDate: '',
  retentionDays: '180',
  startDate: '',
};

const errorId = 'audit-log-cleanup-settings-error';

export function AuditLogCleanupSettingsForm() {
  const client = useTrpcClient();
  const [form, setForm] = useState<CleanupFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CleanupFormError | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CleanupSuccess | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [manualCleanupRange, setManualCleanupRange] = useState<ManualCleanupRange | null>(null);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      setLoading(true);
      setLoadError(null);

      try {
        const config = await client.adminOperations.systemConfig.get.query();

        if (mounted) {
          setForm((current) => ({
            ...current,
            retentionDays: String(config.auditLogRetentionDays),
          }));
        }
      } catch {
        if (mounted) {
          setLoadError('审计日志清理配置加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      mounted = false;
    };
  }, [client]);

  function updateField(field: keyof CleanupFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(null);
  }

  const isBusy = loading || autoSaving || manualSubmitting;
  const manualCleanupButtonText = manualSubmitting ? '清理中...' : '清理选定时间段';

  async function handleManualCleanup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const startDate = parseLocalDateTime(form.startDate);
    const endDate = parseLocalDateTime(form.endDate);

    if (!startDate) {
      setError({ field: 'startDate', message: '请选择手动清理的开始时间。' });
      setSuccess(null);
      return;
    }

    if (!endDate) {
      setError({ field: 'endDate', message: '请选择手动清理的结束时间。' });
      setSuccess(null);
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      setError({ field: 'endDate', message: '结束时间不能早于开始时间。' });
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setManualCleanupRange({ startDate, endDate });
    setManualConfirmOpen(true);
  }

  async function handleConfirmManualCleanup() {
    if (isBusy || !manualCleanupRange) {
      return;
    }

    setManualSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await client.adminOperations.systemAudit.cleanupManual.mutate({
        startDate: manualCleanupRange.startDate.toISOString(),
        endDate: manualCleanupRange.endDate.toISOString(),
      });
      setSuccess({
        scope: 'manual',
        message: `手动清理完成，已删除 ${result.deletedCount} 条审计日志。`,
      });
      setManualCleanupRange(null);
      setManualConfirmOpen(false);
    } catch {
      setError({ field: 'startDate', message: '手动清理失败，请稍后重试。' });
      setSuccess(null);
      setManualConfirmOpen(false);
    } finally {
      setManualSubmitting(false);
    }
  }

  function handleCancelManualCleanup() {
    if (manualSubmitting) {
      return;
    }

    setManualCleanupRange(null);
    setManualConfirmOpen(false);
  }

  async function handleSaveAutoConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const auditLogRetentionDays = parsePositiveInteger(form.retentionDays);

    if (auditLogRetentionDays === null) {
      setError({ field: 'retentionDays', message: '自动清理天数必须是正整数。' });
      setSuccess(null);
      return;
    }

    setAutoSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const config = await client.adminOperations.systemConfig.update.mutate({
        auditLogRetentionDays,
      });
      setForm((current) => ({
        ...current,
        retentionDays: String(config.auditLogRetentionDays),
      }));
      setSuccess({ scope: 'auto', message: '自动清理配置已保存。' });
    } catch {
      setError({ field: 'retentionDays', message: '自动清理配置保存失败，请稍后重试。' });
      setSuccess(null);
    } finally {
      setAutoSaving(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="audit-log-cleanup-settings-title"
        className="relative space-y-12 overflow-hidden rounded-[48px] border border-slate-200 bg-white p-12 shadow-sm"
      >
        <div
          aria-hidden="true"
          className="bg-primary/5 absolute top-0 right-0 h-48 w-48 rounded-bl-[150px]"
        />

        <div className="relative flex items-center gap-5">
          <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-[24px] shadow-inner">
            <CalendarClock aria-hidden="true" size={32} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tracking-tight text-slate-900"
              id="audit-log-cleanup-settings-title"
            >
              系统审计日志清理配置
            </h2>
            <p className="text-sm font-medium text-slate-500">
              配置审计日志的手动清理和自动清理规则
            </p>
          </div>
        </div>

        {loadError ? (
          <p
            aria-live="polite"
            className="relative rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {error ? (
          <p
            aria-live="polite"
            className="relative rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600"
            id={errorId}
            role="alert"
          >
            {error.message}
          </p>
        ) : null}

        {success ? (
          <p
            aria-live="polite"
            className="relative flex items-center gap-3 rounded-3xl border border-green-100 bg-green-50 p-6 text-sm font-bold text-green-600"
          >
            <ShieldCheck aria-hidden="true" size={20} />
            {success.message}
          </p>
        ) : null}

        <form className="relative space-y-8" onSubmit={handleManualCleanup}>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">手动清理</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              按照时间段清理系统审计日志数据
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <label
              className="block space-y-3"
              onClick={() => openDateTimePicker(startDateInputRef.current)}
            >
              <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                开始时间
              </span>
              <input
                aria-describedby={error?.field === 'startDate' ? errorId : undefined}
                aria-invalid={error?.field === 'startDate'}
                className="focus:ring-primary/10 w-full cursor-pointer rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 font-mono text-sm transition-all outline-none focus:ring-4"
                disabled={isBusy}
                onChange={(event) => updateField('startDate', readInputValue(event.currentTarget))}
                ref={startDateInputRef}
                type="datetime-local"
                value={form.startDate}
              />
            </label>

            <label
              className="block space-y-3"
              onClick={() => openDateTimePicker(endDateInputRef.current)}
            >
              <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                结束时间
              </span>
              <input
                aria-describedby={error?.field === 'endDate' ? errorId : undefined}
                aria-invalid={error?.field === 'endDate'}
                className="focus:ring-primary/10 w-full cursor-pointer rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 font-mono text-sm transition-all outline-none focus:ring-4"
                disabled={isBusy}
                onChange={(event) => updateField('endDate', readInputValue(event.currentTarget))}
                ref={endDateInputRef}
                type="datetime-local"
                value={form.endDate}
              />
            </label>
          </div>

          <button
            aria-label={manualCleanupButtonText}
            className="flex min-h-16 w-full items-center justify-center gap-4 rounded-[28px] bg-red-600 px-12 py-5 font-black text-white shadow-2xl shadow-red-600/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy || manualConfirmOpen}
            type="submit"
          >
            <Trash2 aria-hidden="true" size={20} />
            <span className="leading-none font-black text-white">{manualCleanupButtonText}</span>
          </button>
        </form>

        <form
          className="relative space-y-8 border-t border-slate-100 pt-12"
          onSubmit={handleSaveAutoConfig}
        >
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">自动清理</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              按照配置天数清理过期系统审计日志数据
            </p>
          </div>

          <label className="block space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              保留天数
            </span>
            <div className="relative">
              <input
                aria-describedby={error?.field === 'retentionDays' ? errorId : undefined}
                aria-invalid={error?.field === 'retentionDays'}
                className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 pr-20 font-mono text-lg transition-all outline-none focus:ring-4"
                disabled={isBusy}
                inputMode="numeric"
                onChange={(event) =>
                  updateField('retentionDays', readInputValue(event.currentTarget))
                }
                type="text"
                value={form.retentionDays}
              />
              <span className="pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 text-xs font-black tracking-widest text-slate-400">
                天
              </span>
            </div>
          </label>

          <button
            className="bg-primary hover:bg-primary-dark shadow-primary/30 group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[28px] px-12 py-5 font-black text-white shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            type="submit"
          >
            <Save aria-hidden="true" className="relative z-10" size={20} />
            <span className="relative z-10">{autoSaving ? '保存中...' : '保存自动清理配置'}</span>
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0"
            />
          </button>
        </form>
      </section>

      {manualConfirmOpen && manualCleanupRange ? (
        <ManualCleanupConfirmDialog
          onCancel={handleCancelManualCleanup}
          onConfirm={handleConfirmManualCleanup}
          range={manualCleanupRange}
          submitting={manualSubmitting}
        />
      ) : null}
    </>
  );
}

function ManualCleanupConfirmDialog({
  onCancel,
  onConfirm,
  range,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  range: ManualCleanupRange;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="manual-cleanup-confirm-title"
        aria-modal="true"
        className="relative w-full max-w-sm space-y-6 rounded-[32px] bg-white p-8 text-center shadow-2xl"
        role="dialog"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle aria-hidden="true" size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800" id="manual-cleanup-confirm-title">
            确认清理
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            将删除 {formatDateTime(range.startDate)} 至 {formatDateTime(range.endDate)}{' '}
            的系统审计日志，删除后不可恢复。
          </p>
        </div>
        <div className="flex gap-4 pt-4">
          <button
            className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={onCancel}
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
            {submitting ? '清理中...' : '确认清理'}
          </button>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function openDateTimePicker(input: HTMLInputElement | null): void {
  const pickerInput = input as DateTimeInputElement | null;

  if (!pickerInput || pickerInput.disabled) {
    return;
  }

  pickerInput.focus?.();

  try {
    pickerInput.showPicker?.();
  } catch {
    // Focus is the fallback for browsers that reject programmatic picker opening.
  }
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const number = Number(trimmed);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
