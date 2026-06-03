'use client';

import { X } from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

export type ExportCsvDateRange = {
  endDate?: string;
  startDate?: string;
};

type ExportCsvDialogProps = {
  description: string;
  onClose: () => void;
  onSubmit: (range: ExportCsvDateRange) => Promise<void>;
  open: boolean;
  submitError?: string | null;
  submitting?: boolean;
  title: string;
};

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

export function ExportCsvDialog({
  description,
  onClose,
  onSubmit,
  open,
  submitError,
  submitting = false,
  title,
}: ExportCsvDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);
  const openerRef = useRef<FocusableElement | null>(null);
  const titleId = 'export-csv-dialog-title';
  const descriptionId = 'export-csv-dialog-description';

  useEffect(() => {
    if (!open) {
      return;
    }

    openerRef.current = getActiveFocusableElement();
    focusFirstDialogControl(dialogRef.current);

    return () => {
      openerRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setError('开始日期不能晚于结束日期。');
      return;
    }

    setError(null);
    await onSubmit({
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
  }

  function handleClose() {
    if (submitting) {
      return;
    }

    onClose();
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setError(null);
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    setError(null);
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
        className="relative w-full max-w-sm space-y-6 overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl"
        onKeyDown={(event) => handleDialogKeyDown(event, handleClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800" id={titleId}>
              {title}
            </h2>
            <p className="text-sm leading-5 text-slate-500" id={descriptionId}>
              {description}
            </p>
          </div>
          <button
            aria-label="关闭导出弹窗"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={24} />
          </button>
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

        {submitError ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">开始日期</span>
            <input
              className="focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none disabled:opacity-60"
              disabled={submitting}
              onChange={(event) => handleStartDateChange(readControlValue(event.currentTarget))}
              type="date"
              value={startDate}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">结束日期</span>
            <input
              className="focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none disabled:opacity-60"
              disabled={submitting}
              onChange={(event) => handleEndDateChange(readControlValue(event.currentTarget))}
              type="date"
              value={endDate}
            />
          </label>

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
              className="bg-primary hover:bg-primary-dark flex-1 rounded-xl py-3 font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? '导出中...' : '确认导出'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
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

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
