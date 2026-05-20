'use client';

import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
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
  const titleId = 'export-csv-dialog-title';

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

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setError(null);
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    setError(null);
  }

  return (
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        onKeyDown={(event) => handleDialogKeyDown(event, handleClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        style={styles.dialog}
        tabIndex={-1}
      >
        <div style={styles.header}>
          <div style={styles.titleBlock}>
            <h2 id={titleId} style={styles.title}>
              {title}
            </h2>
            <p style={styles.description}>{description}</p>
          </div>
          <button
            disabled={submitting}
            onClick={handleClose}
            style={styles.closeButton}
            type="button"
          >
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
            <span style={styles.label}>开始日期</span>
            <input
              disabled={submitting}
              onChange={(event) => handleStartDateChange(readControlValue(event.currentTarget))}
              style={styles.input}
              type="date"
              value={startDate}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>结束日期</span>
            <input
              disabled={submitting}
              onChange={(event) => handleEndDateChange(readControlValue(event.currentTarget))}
              style={styles.input}
              type="date"
              value={endDate}
            />
          </label>

          <div style={styles.actions}>
            <button
              disabled={submitting}
              onClick={handleClose}
              style={styles.secondaryButton}
              type="button"
            >
              取消
            </button>
            <button disabled={submitting} style={styles.primaryButton} type="submit">
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
  description: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  dialog: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.24)',
    display: 'grid',
    gap: 14,
    maxHeight: 'calc(100vh - 40px)',
    maxWidth: 460,
    overflow: 'auto',
    padding: 18,
    width: 'min(100%, 460px)',
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
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
  titleBlock: {
    display: 'grid',
    gap: 4,
  },
} satisfies Record<string, CSSProperties>;
