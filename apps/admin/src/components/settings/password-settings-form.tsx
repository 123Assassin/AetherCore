'use client';

import { type CSSProperties, type FormEvent, useState } from 'react';

type PasswordFormState = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

type PasswordFormError = {
  field: keyof PasswordFormState;
  message: string;
};

const emptyForm: PasswordFormState = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
};

const errorId = 'password-settings-error';

export function PasswordSettingsForm() {
  const [form, setForm] = useState<PasswordFormState>(emptyForm);
  const [error, setError] = useState<PasswordFormError | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(field: keyof PasswordFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.currentPassword) {
      setError({ field: 'currentPassword', message: '请输入当前密码。' });
      setSuccess(false);
      return;
    }

    if (!form.newPassword) {
      setError({ field: 'newPassword', message: '请输入新密码。' });
      setSuccess(false);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError({ field: 'confirmPassword', message: '新密码和确认密码不一致。' });
      setSuccess(false);
      return;
    }

    setForm(emptyForm);
    setError(null);
    setSuccess(true);
  }

  return (
    <section aria-labelledby="password-settings-title" style={styles.panel}>
      <div style={styles.header}>
        <p style={styles.eyebrow}>Security</p>
        <h2 id="password-settings-title" style={styles.title}>
          管理员密码
        </h2>
      </div>

      {error ? (
        <p aria-live="polite" id={errorId} role="alert" style={styles.error}>
          {error.message}
        </p>
      ) : null}

      {success ? (
        <p aria-live="polite" style={styles.success}>
          密码表单已通过本地校验。
        </p>
      ) : null}

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.field}>
          <span style={styles.label}>当前密码</span>
          <input
            aria-describedby={error?.field === 'currentPassword' ? errorId : undefined}
            aria-invalid={error?.field === 'currentPassword'}
            autoComplete="current-password"
            onChange={(event) =>
              updateField('currentPassword', readInputValue(event.currentTarget))
            }
            style={styles.input}
            type="password"
            value={form.currentPassword}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>新密码</span>
          <input
            aria-describedby={error?.field === 'newPassword' ? errorId : undefined}
            aria-invalid={error?.field === 'newPassword'}
            autoComplete="new-password"
            onChange={(event) => updateField('newPassword', readInputValue(event.currentTarget))}
            style={styles.input}
            type="password"
            value={form.newPassword}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>确认新密码</span>
          <input
            aria-describedby={error?.field === 'confirmPassword' ? errorId : undefined}
            aria-invalid={error?.field === 'confirmPassword'}
            autoComplete="new-password"
            onChange={(event) =>
              updateField('confirmPassword', readInputValue(event.currentTarget))
            }
            style={styles.input}
            type="password"
            value={form.confirmPassword}
          />
        </label>

        <div style={styles.actions}>
          <button style={styles.primaryButton} type="submit">
            保存密码
          </button>
        </div>
      </form>
    </section>
  );
}

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: '20px',
  padding: '9px 14px',
} satisfies CSSProperties;

const styles = {
  actions: {
    display: 'flex',
    justifyContent: 'end',
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
    margin: 0,
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
    display: 'grid',
    gap: 2,
  },
  input: {
    border: '1px solid #b9c3d0',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    padding: '9px 10px',
  },
  label: {
    color: '#334155',
    fontSize: 13,
    lineHeight: '18px',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    padding: 18,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  success: {
    background: '#ecfdf5',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    color: '#166534',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
