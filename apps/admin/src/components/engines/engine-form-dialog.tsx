'use client';

import type { AdminModelEngineCreateInput, AdminModelEngineItem } from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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

    focusFirstDialogControl(dialogRef.current);
  }, [open]);

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
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={engineDialogTitleId}
        aria-modal="true"
        onKeyDown={(event) => handleDialogKeyDown(event, onClose, submitting)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        style={styles.dialog}
        tabIndex={-1}
      >
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Operations / Engine Dispatch</p>
            <h2 id={engineDialogTitleId} style={styles.title}>
              {engine ? '编辑模型引擎' : '新建模型引擎'}
            </h2>
          </div>
          <button disabled={submitting} onClick={onClose} style={styles.closeButton} type="button">
            关闭
          </button>
        </div>

        {visibleError ? (
          <p aria-live="polite" role="alert" style={styles.error}>
            {visibleError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inlineFields}>
            <label style={styles.field}>
              <span style={styles.label}>名称</span>
              <input
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, name: value }));
                }}
                placeholder="例如：OpenAI 主通道"
                style={styles.input}
                value={form.name}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Provider</span>
              <select
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, provider: value as EngineProvider }));
                }}
                style={styles.input}
                value={form.provider}
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerLabels[provider]} / {provider}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>API Base URL</span>
            <input
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, apiBaseUrl: value }));
              }}
              placeholder="https://api.example.com/v1"
              style={styles.input}
              value={form.apiBaseUrl}
            />
          </label>

          {engine ? (
            <div style={styles.maskedKeyRow}>
              <span style={styles.label}>当前 API Key</span>
              <code style={styles.maskedKey}>{engine.apiKeyMasked}</code>
            </div>
          ) : null}

          <label style={styles.field}>
            <span style={styles.label}>{engine ? '替换 API Key' : 'API Key'}</span>
            <input
              autoComplete="new-password"
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, apiKey: value }));
              }}
              placeholder={engine ? '留空则不替换' : '请输入 API Key'}
              style={styles.input}
              type="password"
              value={form.apiKey}
            />
          </label>

          <div style={styles.inlineFields}>
            <label style={styles.field}>
              <span style={styles.label}>Model Name</span>
              <input
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, modelName: value }));
                }}
                placeholder="例如：gpt-4.1"
                style={styles.input}
                value={form.modelName}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>状态</span>
              <select
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, status: value as EngineStatus }));
                }}
                style={styles.input}
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

          <div style={styles.actions}>
            <button
              disabled={submitting}
              onClick={onClose}
              style={styles.secondaryButton}
              type="button"
            >
              取消
            </button>
            <button disabled={submitting} style={styles.primaryButton} type="submit">
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </section>
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

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}

const providerLabels: Record<EngineProvider, string> = {
  custom: 'Custom',
  gemini: 'Gemini',
  openai: 'OpenAI',
};

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '8px 12px',
} satisfies CSSProperties;

const styles = {
  actions: {
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    gap: 10,
    justifyContent: 'end',
    paddingTop: 14,
  },
  backdrop: {
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.42)',
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  closeButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  dialog: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.24)',
    display: 'grid',
    gap: 14,
    maxHeight: 'calc(100vh - 40px)',
    maxWidth: 720,
    overflow: 'auto',
    padding: 18,
    width: 'min(100%, 720px)',
  },
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
  field: {
    display: 'grid',
    gap: 6,
  },
  form: {
    display: 'grid',
    gap: 14,
  },
  header: {
    alignItems: 'start',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  inlineFields: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  },
  input: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 38,
    padding: '8px 10px',
    width: '100%',
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
  },
  maskedKey: {
    color: '#334155',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '18px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  maskedKeyRow: {
    background: '#f8fafc',
    border: '1px solid #d8dee8',
    borderRadius: 6,
    display: 'grid',
    gap: 6,
    padding: 10,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  title: {
    color: '#172033',
    fontSize: 20,
    lineHeight: '28px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
