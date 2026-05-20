'use client';

import type {
  AdminActivityCreateInput,
  AdminActivityItem,
  AdminActivityStatus,
} from '@package/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

type ActivityNoticeFormDialogProps = {
  activity: AdminActivityItem | null;
  onClose: () => void;
  onSubmit: (input: AdminActivityCreateInput) => Promise<void>;
  open: boolean;
  submitError?: string | null;
  submitting?: boolean;
};

type ActivityNoticeFormState = {
  content: string;
  status: AdminActivityStatus;
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

const defaultFormState: ActivityNoticeFormState = {
  content: '',
  status: 'draft',
  title: '',
};
const activityDialogTitleId = 'activity-notice-form-dialog-title';

export function ActivityNoticeFormDialog({
  activity,
  onClose,
  onSubmit,
  open,
  submitError,
  submitting = false,
}: ActivityNoticeFormDialogProps) {
  const [form, setForm] = useState<ActivityNoticeFormState>(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
      setForm(
        activity
          ? {
              content: activity.content,
              status: activity.status,
              title: activity.title,
            }
          : defaultFormState
      );
      focusFirstDialogControl(dialogRef.current);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activity, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) {
      setError('请输入活动通告标题。');
      return;
    }

    if (!content) {
      setError('请输入活动通告正文。');
      return;
    }

    setError(null);
    await onSubmit({ content, status: form.status, title });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <motion.div
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-labelledby={activityDialogTitleId}
        aria-modal="true"
        className="relative w-full max-w-2xl overflow-hidden rounded-[40px] bg-white shadow-2xl"
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        onKeyDown={(event) => handleDialogKeyDown(event, onClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 p-10">
          <div>
            <h3
              className="text-2xl font-black tracking-tight text-slate-900"
              id={activityDialogTitleId}
            >
              {activity ? '编辑活动通告' : '发布新活动通告'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">设置内容及发布状态</p>
          </div>
          <button
            aria-label="关闭活动通告表单"
            className="rounded-full p-3 text-slate-400 transition-all hover:bg-white hover:shadow-md"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-8 p-10">
            {error ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {submitError ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <label className="space-y-3">
              <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                标题
              </span>
              <input
                className="focus:border-primary focus:ring-primary/10 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-4 font-bold text-slate-800 transition-all outline-none placeholder:text-slate-300 focus:ring-4"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: readControlValue(event.currentTarget),
                  }))
                }
                placeholder="请输入简明扼要的标题..."
                value={form.title}
              />
            </label>

            <label className="space-y-3">
              <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                正文内容
              </span>
              <textarea
                className="focus:border-primary focus:ring-primary/10 w-full resize-none rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-4 font-medium text-slate-600 transition-all outline-none placeholder:text-slate-300 focus:ring-4"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: readControlValue(event.currentTarget),
                  }))
                }
                placeholder="在此输入详细的活动通告内容..."
                rows={6}
                value={form.content}
              />
            </label>

            <div className="space-y-3">
              <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                状态设置
              </span>
              <div className="flex rounded-2xl border border-slate-200/50 bg-slate-100 p-1.5">
                {statusOptions.map((option) => (
                  <button
                    className={`flex-1 rounded-xl py-3 text-xs font-black transition-all ${
                      form.status === option.value
                        ? 'text-primary bg-white shadow-md'
                        : 'text-slate-400'
                    }`}
                    key={option.value}
                    onClick={() => setForm((current) => ({ ...current, status: option.value }))}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 bg-slate-50/30 p-10">
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              放弃修改
            </button>
            <button
              className="bg-primary hover:bg-primary-dark group shadow-primary/30 relative flex-1 overflow-hidden rounded-2xl py-4 font-black text-white shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              <span className="relative z-10">
                {submitting ? '保存中...' : activity ? '保存更改' : '确认并发布'}
              </span>
              <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </div>
        </form>
      </motion.section>
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

const statusOptions: { label: string; value: AdminActivityStatus }[] = [
  { label: '立即发布', value: 'published' },
  { label: '存为草稿', value: 'draft' },
];
