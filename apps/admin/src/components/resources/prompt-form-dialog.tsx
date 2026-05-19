'use client';

import type { AdminPromptCreateInput, AdminPromptItem } from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}

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
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={promptDialogTitleId}
        aria-modal="true"
        onKeyDown={(event) => handleDialogKeyDown(event, onClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        style={styles.dialog}
        tabIndex={-1}
      >
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Resources / Prompts</p>
            <h2 id={promptDialogTitleId} style={styles.title}>
              {prompt ? '编辑 Prompt' : '新建 Prompt'}
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton} type="button">
            关闭
          </button>
        </div>

        {error ? (
          <p aria-live="polite" role="alert" style={styles.error}>
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inlineFields}>
            <label style={styles.field}>
              <span style={styles.label}>标题</span>
              <input
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, title: value }));
                }}
                placeholder="例如：通用对话提示词"
                style={styles.input}
                value={form.title}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>版本</span>
              <input
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({
                    ...current,
                    version: value,
                  }));
                }}
                placeholder="例如：v1"
                style={styles.input}
                value={form.version}
              />
            </label>
          </div>

          <div style={styles.editorGrid}>
            <label style={styles.field}>
              <span style={styles.label}>内容</span>
              <textarea
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({
                    ...current,
                    content: value,
                  }));
                }}
                placeholder="# 标题&#10;- 要点"
                style={styles.textarea}
                value={form.content}
              />
            </label>

            <section aria-label="Markdown 预览" style={styles.previewPanel}>
              <span style={styles.label}>预览</span>
              <div style={styles.previewBox}>
                <PromptMarkdownPreview content={form.content} />
              </div>
            </section>
          </div>

          <div style={styles.actions}>
            <button onClick={onClose} style={styles.secondaryButton} type="button">
              取消
            </button>
            <button disabled={submitting} style={styles.primaryButton} type="submit">
              {submitting ? '保存中…' : '保存'}
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

function getFocusableElements(container: FocusableDialogElement): FocusableElement[] {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
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
    maxWidth: 920,
    overflow: 'auto',
    padding: 18,
    width: 'min(100%, 920px)',
  },
  editorGrid: {
    alignItems: 'start',
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  previewBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    minHeight: 260,
    padding: 12,
  },
  previewPanel: {
    display: 'grid',
    gap: 6,
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
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    lineHeight: '20px',
    minHeight: 300,
    padding: 10,
    resize: 'vertical',
    width: '100%',
  },
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
