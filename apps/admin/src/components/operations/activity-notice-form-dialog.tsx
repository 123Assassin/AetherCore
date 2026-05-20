'use client';

import type {
  AdminActivityCreateInput,
  AdminActivityItem,
  AdminActivityStatus,
} from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

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
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activity, open]);

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
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={activityDialogTitleId}
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
            <p style={styles.eyebrow}>Operations / Activities</p>
            <h2 id={activityDialogTitleId} style={styles.title}>
              {activity ? '编辑活动通告' : '新建活动通告'}
            </h2>
          </div>
          <button disabled={submitting} onClick={onClose} style={styles.closeButton} type="button">
            关闭
          </button>
        </div>

        {error ? (
          <p aria-live="polite" role="alert" style={styles.error}>
            {error}
          </p>
        ) : null}

        {submitError ? (
          <p aria-live="polite" role="alert" style={styles.error}>
            {submitError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>标题</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, title: readControlValue(event.currentTarget) }))
              }
              placeholder="例如：系统维护通告"
              style={styles.input}
              value={form.title}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>正文</span>
            <textarea
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  content: readControlValue(event.currentTarget),
                }))
              }
              placeholder="输入活动、通告或功能更新内容"
              style={styles.textarea}
              value={form.content}
            />
          </label>

          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>状态</legend>
            <div style={styles.segmented}>
              {statusOptions.map((option) => {
                const selected = form.status === option.value;

                return (
                  <label key={option.value} style={styles.segmentedOption}>
                    <input
                      checked={selected}
                      name="activity-status"
                      onChange={() => setForm((current) => ({ ...current, status: option.value }))}
                      style={styles.radio}
                      type="radio"
                    />
                    <span style={selected ? styles.segmentedActive : styles.segmentedText}>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

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
  { label: '发布', value: 'published' },
  { label: '草稿', value: 'draft' },
];

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
  fieldset: {
    border: 0,
    display: 'grid',
    gap: 8,
    margin: 0,
    padding: 0,
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
  legend: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    padding: 0,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  radio: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  segmented: {
    border: '1px solid #c8d1dc',
    borderRadius: 6,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    overflow: 'hidden',
  },
  segmentedActive: {
    background: '#0f766e',
    color: '#ffffff',
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    padding: '8px 10px',
    textAlign: 'center',
  },
  segmentedOption: {
    cursor: 'pointer',
    minWidth: 0,
    position: 'relative',
  },
  segmentedText: {
    background: '#ffffff',
    color: '#334155',
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
    padding: '8px 10px',
    textAlign: 'center',
  },
  textarea: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '22px',
    minHeight: 180,
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
