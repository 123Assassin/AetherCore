'use client';

import type {
  AdminSensitiveWordListCreateInput,
  AdminSensitiveWordListItem,
} from '@package/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

type SensitiveWordFormDialogProps = {
  list: AdminSensitiveWordListItem | null;
  onClose: () => void;
  onSubmit: (input: AdminSensitiveWordListCreateInput) => Promise<void>;
  open: boolean;
  submitError?: string | null;
  submitting?: boolean;
};

type SensitiveWordFormState = {
  name: string;
  words: string;
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

const defaultFormState: SensitiveWordFormState = {
  name: '',
  words: '',
};
const sensitiveWordDialogTitleId = 'sensitive-word-form-dialog-title';

export function SensitiveWordFormDialog({
  list,
  onClose,
  onSubmit,
  open,
  submitError = null,
  submitting = false,
}: SensitiveWordFormDialogProps) {
  const [form, setForm] = useState<SensitiveWordFormState>(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
      setForm(list ? toFormState(list) : defaultFormState);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [list, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    focusFirstDialogControl(dialogRef.current);
  }, [open]);

  if (!open) {
    return null;
  }

  const visibleError = error ?? submitError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const words = parseWords(form.words);

    if (!name) {
      setError('请输入敏感词库名称。');
      return;
    }

    if (words.length === 0) {
      setError('请输入至少一个敏感词，多个词请用英文逗号分隔。');
      return;
    }

    setError(null);
    await onSubmit({ name, words });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <motion.div
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.section
        animate={{ opacity: 1, scale: 1 }}
        aria-labelledby={sensitiveWordDialogTitleId}
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl"
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
        onKeyDown={(event) => handleDialogKeyDown(event, onClose, submitting)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800" id={sensitiveWordDialogTitleId}>
            {list ? '编辑词库' : '新建词库'}
          </h3>
          <button
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {visibleError ? (
          <p
            aria-live="polite"
            className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {visibleError}
          </p>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="space-y-2">
              <span className="block text-sm font-bold text-slate-700">词库名称</span>
              <input
                className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, name: value }));
                }}
                placeholder="例如：默认屏蔽字库"
                value={form.name}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-bold text-slate-700">敏感词列表 (逗号分隔)</span>
              <textarea
                className="focus:border-primary focus:ring-primary/10 min-h-36 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, words: value }));
                }}
                placeholder="例如：违规词, 风险词, 屏蔽词"
                value={form.words}
              />
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="bg-primary hover:bg-primary-dark flex-1 rounded-2xl py-4 font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}

function toFormState(list: AdminSensitiveWordListItem): SensitiveWordFormState {
  return {
    name: list.name,
    words: list.words.join(', '),
  };
}

function parseWords(value: string): string[] {
  return value
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean);
}

function handleDialogKeyDown(event: KeyboardEvent, onClose: () => void, submitting: boolean) {
  if (event.key === 'Escape') {
    event.preventDefault();

    if (!submitting) {
      onClose();
    }

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

function getFocusableElements(container: FocusableDialogElement): FocusableElement[] {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
}

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}
