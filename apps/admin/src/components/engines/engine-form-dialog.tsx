'use client';

import type { AdminModelEngineCreateInput, AdminModelEngineItem } from '@package/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

export type EngineFormSubmitInput = Omit<AdminModelEngineCreateInput, 'apiKey'> & {
  apiKey?: string;
};

type EngineFormDialogProps = {
  engine: AdminModelEngineItem | null;
  onClose: () => void;
  onSubmit: (input: EngineFormSubmitInput) => Promise<void>;
  open: boolean;
  submitError?: string | null;
  submitting?: boolean;
};

type EngineProvider = AdminModelEngineCreateInput['provider'];
type EngineStatus = NonNullable<AdminModelEngineCreateInput['status']>;

type EngineFormState = {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  name: string;
  provider: EngineProvider;
  status: EngineStatus;
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

type UrlConstructor = new (url: string) => {
  protocol: string;
};

const defaultFormState: EngineFormState = {
  apiBaseUrl: '',
  apiKey: '',
  modelName: '',
  name: '',
  provider: 'openai',
  status: 'enabled',
};
const providerOptions = ['openai', 'gemini', 'custom'] as const satisfies readonly EngineProvider[];
const statusOptions = ['enabled', 'disabled'] as const satisfies readonly EngineStatus[];
const engineDialogTitleId = 'engine-form-dialog-title';

export function EngineFormDialog({
  engine,
  onClose,
  onSubmit,
  open,
  submitError = null,
  submitting = false,
}: EngineFormDialogProps) {
  const [form, setForm] = useState<EngineFormState>(() =>
    engine ? toFormState(engine) : defaultFormState
  );
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
      setForm(engine ? toFormState(engine) : defaultFormState);
      focusFirstDialogControl(dialogRef.current);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [engine, open]);

  if (!open) {
    return null;
  }

  const visibleError = error ?? submitError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const apiBaseUrl = form.apiBaseUrl.trim();
    const apiKey = form.apiKey.trim();
    const modelName = form.modelName.trim();

    if (!name) {
      setError('请输入模型引擎名称。');
      return;
    }

    if (!apiBaseUrl) {
      setError('请输入 API Base URL。');
      return;
    }

    if (!isHttpUrl(apiBaseUrl)) {
      setError('API Base URL 必须是有效的 http 或 https 地址。');
      return;
    }

    if (!engine && !apiKey) {
      setError('新建模型引擎必须填写 API Key。');
      return;
    }

    setError(null);
    await onSubmit({
      apiBaseUrl,
      ...(apiKey ? { apiKey } : {}),
      modelName: modelName || null,
      name,
      provider: form.provider,
      status: form.status,
    });
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
        aria-labelledby={engineDialogTitleId}
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
          <h3 className="text-xl font-bold text-slate-800" id={engineDialogTitleId}>
            {engine ? '编辑模型引擎' : '新增模型引擎'}
          </h3>
          <button
            aria-label="关闭模型引擎表单"
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
            className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {visibleError}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">引擎名称</span>
            <input
              className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors outline-none"
              onChange={(event) =>
                setForm((current) => ({ ...current, name: readControlValue(event.currentTarget) }))
              }
              placeholder="如：OpenAI GPT-4"
              value={form.name}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Provider</span>
            <select
              className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors outline-none"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  provider: readControlValue(event.currentTarget) as EngineProvider,
                }))
              }
              value={form.provider}
            >
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabels[provider]} / {provider}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">API 地址</span>
            <input
              className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm transition-colors outline-none"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  apiBaseUrl: readControlValue(event.currentTarget),
                }))
              }
              placeholder="https://api.openai.com/v1"
              value={form.apiBaseUrl}
            />
          </label>

          {engine ? (
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-700">当前 API Key</span>
              <code className="block truncate font-mono text-sm text-slate-500 blur-[2px] transition-all hover:blur-none">
                {engine.apiKeyMasked}
              </code>
            </div>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              {engine ? '替换 API Key' : 'API Key'}
            </span>
            <input
              autoComplete="new-password"
              className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm transition-colors outline-none"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  apiKey: readControlValue(event.currentTarget),
                }))
              }
              placeholder={engine ? '留空则不替换' : 'sk-...'}
              type="password"
              value={form.apiKey}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Model Name</span>
              <input
                className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    modelName: readControlValue(event.currentTarget),
                  }))
                }
                placeholder="如：gpt-4.1"
                value={form.modelName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">状态</span>
              <select
                className="focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: readControlValue(event.currentTarget) as EngineStatus,
                  }))
                }
                value={form.status}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'enabled' ? '启用' : '停用'}
                  </option>
                ))}
              </select>
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
              className="bg-primary hover:bg-primary-dark flex-1 rounded-2xl py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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

function toFormState(engine: AdminModelEngineItem): EngineFormState {
  return {
    apiBaseUrl: engine.apiBaseUrl,
    apiKey: '',
    modelName: engine.modelName ?? '',
    name: engine.name,
    provider: engine.provider,
    status: engine.status,
  };
}

function isHttpUrl(value: string): boolean {
  const UrlCtor = (globalThis as typeof globalThis & { URL?: UrlConstructor }).URL;

  if (!UrlCtor) {
    return /^https?:\/\/\S+$/i.test(value);
  }

  try {
    const parsed = new UrlCtor(value);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
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

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

const providerLabels: Record<EngineProvider, string> = {
  custom: 'Custom',
  gemini: 'Gemini',
  openai: 'OpenAI',
};
