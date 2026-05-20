'use client';

import type {
  AdminSensitiveWordListCreateInput,
  AdminSensitiveWordListItem,
} from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  const [form, setForm] = useState<SensitiveWordFormState>(() =>
    list ? toFormState(list) : defaultFormState
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
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={sensitiveWordDialogTitleId}
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
            <p style={styles.eyebrow}>Resources / Sensitive Words</p>
            <h2 id={sensitiveWordDialogTitleId} style={styles.title}>
              {list ? '编辑敏感词库' : '新建敏感词库'}
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
          <label style={styles.field}>
            <span style={styles.label}>名称</span>
            <input
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, name: value }));
              }}
              placeholder="例如：默认敏感词库"
              style={styles.input}
              value={form.name}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>敏感词</span>
            <textarea
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, words: value }));
              }}
              placeholder="例如：违规词, 风险词, 屏蔽词"
              rows={8}
              style={styles.textarea}
              value={form.words}
            />
          </label>

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
    maxWidth: 640,
    overflow: 'auto',
    padding: 18,
    width: 'min(100%, 640px)',
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
  textarea: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 150,
    padding: '8px 10px',
    resize: 'vertical',
    width: '100%',
  },
  title: {
    color: '#172033',
    fontSize: 20,
    lineHeight: '28px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
