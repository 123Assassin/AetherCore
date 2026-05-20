'use client';

import type { AdminAlarmConfig, AdminAlarmConfigUpdateInput } from '@package/shared';
import { type CSSProperties, type FormEvent, useState } from 'react';

type AlarmConfigFormProps = {
  config: AdminAlarmConfig;
  onDirty?: () => void;
  onSubmit: (input: AdminAlarmConfigUpdateInput) => Promise<void>;
  submitError?: string | null;
  submitting?: boolean;
};

type AlarmConfigFormState = {
  email: string;
  threshold: string;
};

export function AlarmConfigForm({
  config,
  onDirty,
  onSubmit,
  submitError,
  submitting = false,
}: AlarmConfigFormProps) {
  const [form, setForm] = useState<AlarmConfigFormState>(() => toFormState(config));
  const [error, setError] = useState<string | null>(null);

  function updateForm(patch: Partial<AlarmConfigFormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    onDirty?.();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const parsed = parseAlarmConfigForm(form, config.currency);

    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }

    setError(null);
    await onSubmit(parsed.input);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <section style={styles.notice}>
        <strong style={styles.noticeTitle}>费用告警</strong>
        <p style={styles.noticeText}>当模型引擎费用达到阈值后，系统会向通知邮箱发送告警信息。</p>
      </section>

      <label style={styles.field}>
        <span style={styles.label}>费用告警阈值 ({config.currency})</span>
        <input
          disabled={submitting}
          min="0"
          onChange={(event) => updateForm({ threshold: readControlValue(event.currentTarget) })}
          placeholder="例如：100"
          style={styles.input}
          step="0.01"
          type="number"
          value={form.threshold}
        />
      </label>

      <label style={styles.field}>
        <span style={styles.label}>通知邮箱</span>
        <input
          disabled={submitting}
          onChange={(event) => updateForm({ email: readControlValue(event.currentTarget) })}
          placeholder="admin@example.com"
          style={styles.input}
          type="email"
          value={form.email}
        />
      </label>

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

      <div style={styles.actions}>
        <button disabled={submitting} style={styles.primaryButton} type="submit">
          {submitting ? '保存中...' : '保存告警配置'}
        </button>
      </div>
    </form>
  );
}

function toFormState(config: AdminAlarmConfig): AlarmConfigFormState {
  return {
    email: config.email,
    threshold: String(config.threshold),
  };
}

function parseAlarmConfigForm(
  form: AlarmConfigFormState,
  currency: string
): { error: string } | { input: AdminAlarmConfigUpdateInput } {
  const email = form.email.trim();
  const thresholdText = form.threshold.trim();
  const threshold = Number(thresholdText);

  if (!thresholdText || !Number.isFinite(threshold) || threshold < 0) {
    return { error: '费用告警阈值必须是非负数字。' };
  }

  if (!isValidEmail(email)) {
    return { error: '请输入有效的通知邮箱。' };
  }

  return {
    input: {
      currency,
      email,
      threshold,
    },
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  padding: '9px 12px',
} satisfies CSSProperties;

const styles = {
  actions: {
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    justifyContent: 'end',
    paddingTop: 14,
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
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    maxWidth: 680,
    padding: 16,
  },
  input: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 40,
    padding: '8px 10px',
    width: '100%',
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
  },
  notice: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 6,
    display: 'grid',
    gap: 4,
    padding: 12,
  },
  noticeText: {
    color: '#9a3412',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
  },
  noticeTitle: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: '20px',
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
    minHeight: 40,
  },
} satisfies Record<string, CSSProperties>;
