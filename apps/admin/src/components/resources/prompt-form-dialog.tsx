'use client';

import type { AdminPromptCreateInput, AdminPromptItem } from '@package/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { PromptMarkdownPreview } from './prompt-markdown-preview';

type PromptFormDialogProps = {
  onClose: () => void;
  onSubmit: (input: AdminPromptCreateInput) => Promise<void>;
  open: boolean;
  prompt: AdminPromptItem | null;
  submitting?: boolean;
};

type PromptFormState = {
  content: string;
  title: string;
  version: string;
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

const defaultFormState: PromptFormState = {
  content: '',
  title: '',
  version: '',
};
const promptDialogTitleId = 'prompt-form-dialog-title';

export function PromptFormDialog({
  onClose,
  onSubmit,
  open,
  prompt,
  submitting = false,
}: PromptFormDialogProps) {
  const [form, setForm] = useState<PromptFormState>(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
      setForm(
        prompt
          ? {
              content: prompt.content,
              title: prompt.title,
              version: prompt.version,
            }
          : defaultFormState
      );
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [open, prompt]);

  useEffect(() => {
    if (!open) {
      return;
    }

    focusFirstDialogControl(dialogRef.current);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const version = form.version.trim();
    const content = form.content.trim();

    if (!title) {
      setError('请输入 Prompt 标题。');
      return;
    }

    if (!version) {
      setError('请输入 Prompt 版本。');
      return;
    }

    if (!content) {
      setError('请输入 Prompt 内容。');
      return;
    }

    setError(null);
    await onSubmit({ content, title, version });
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
        aria-labelledby={promptDialogTitleId}
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
        onKeyDown={(event) => handleDialogKeyDown(event, onClose, submitting)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800" id={promptDialogTitleId}>
              {prompt ? '编辑 Prompt' : '新建 Prompt'}
            </h3>
            <p className="text-sm text-slate-500">管理和维护模型提示词模板版本</p>
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-scrollbar max-h-[64vh] space-y-6 overflow-y-auto p-8">
            {error ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-bold text-slate-700">标题</span>
                <input
                  className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                  onChange={(event) => {
                    const value = readFormValue(event.currentTarget);

                    setForm((current) => ({ ...current, title: value }));
                  }}
                  placeholder="例如：通用对话提示词"
                  value={form.title}
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-bold text-slate-700">版本号</span>
                <input
                  className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                  onChange={(event) => {
                    const value = readFormValue(event.currentTarget);

                    setForm((current) => ({ ...current, version: value }));
                  }}
                  placeholder="例如：v1.0"
                  value={form.version}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-bold text-slate-700">内容</span>
                <textarea
                  className="focus:border-primary focus:ring-primary/10 min-h-[320px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-700 transition-all outline-none focus:ring-4"
                  onChange={(event) => {
                    const value = readFormValue(event.currentTarget);

                    setForm((current) => ({ ...current, content: value }));
                  }}
                  placeholder="# 标题&#10;- 要点"
                  value={form.content}
                />
              </label>

              <section aria-label="Markdown 预览" className="space-y-2">
                <span className="block text-sm font-bold text-slate-700">预览</span>
                <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <PromptMarkdownPreview content={form.content} />
                </div>
              </section>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 bg-slate-50/50 p-8">
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
