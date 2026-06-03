'use client';

import { Lock, Save, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

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
  const client = useTrpcClient();
  const [form, setForm] = useState<PasswordFormState>(emptyForm);
  const [error, setError] = useState<PasswordFormError | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof PasswordFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

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

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await client.adminAuth.changePassword.mutate({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(emptyForm);
      setSuccess(true);
    } catch (caughtError) {
      setError(toPasswordChangeError(caughtError));
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="password-settings-title"
      className="relative space-y-12 overflow-hidden rounded-[48px] border border-slate-200 bg-white p-12 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="bg-primary/5 absolute top-0 right-0 h-48 w-48 rounded-bl-[150px]"
      />

      <div className="relative flex items-center gap-5">
        <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-[24px] shadow-inner">
          <Lock aria-hidden="true" size={32} />
        </div>
        <div>
          <h2
            className="text-3xl font-black tracking-tight text-slate-900"
            id="password-settings-title"
          >
            管理员密码
          </h2>
          <p className="text-sm font-medium text-slate-500">系统全局控制的身份验证密钥</p>
        </div>
      </div>

      {error ? (
        <p
          aria-live="polite"
          className="relative rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600"
          id={errorId}
          role="alert"
        >
          {error.message}
        </p>
      ) : null}

      {success ? (
        <p
          aria-live="polite"
          className="relative flex items-center gap-3 rounded-3xl border border-green-100 bg-green-50 p-6 text-sm font-bold text-green-600"
        >
          <ShieldCheck aria-hidden="true" size={20} />
          管理员密码更新成功，请重新登录。
        </p>
      ) : null}

      <form className="relative space-y-8" onSubmit={handleSubmit}>
        <label className="block space-y-3">
          <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            当前密码
          </span>
          <input
            aria-describedby={error?.field === 'currentPassword' ? errorId : undefined}
            aria-invalid={error?.field === 'currentPassword'}
            autoComplete="current-password"
            className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 font-mono text-lg transition-all outline-none focus:ring-4"
            disabled={submitting}
            onChange={(event) =>
              updateField('currentPassword', readInputValue(event.currentTarget))
            }
            placeholder="••••••••"
            type="password"
            value={form.currentPassword}
          />
        </label>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <label className="block space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              新密码
            </span>
            <input
              aria-describedby={error?.field === 'newPassword' ? errorId : undefined}
              aria-invalid={error?.field === 'newPassword'}
              autoComplete="new-password"
              className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 font-mono text-lg transition-all outline-none focus:ring-4"
              disabled={submitting}
              onChange={(event) => updateField('newPassword', readInputValue(event.currentTarget))}
              type="password"
              value={form.newPassword}
            />
          </label>

          <label className="block space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              确认新密码
            </span>
            <input
              aria-describedby={error?.field === 'confirmPassword' ? errorId : undefined}
              aria-invalid={error?.field === 'confirmPassword'}
              autoComplete="new-password"
              className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 font-mono text-lg transition-all outline-none focus:ring-4"
              disabled={submitting}
              onChange={(event) =>
                updateField('confirmPassword', readInputValue(event.currentTarget))
              }
              type="password"
              value={form.confirmPassword}
            />
          </label>
        </div>

        <button
          className="bg-primary hover:bg-primary-dark shadow-primary/30 group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[28px] px-12 py-5 font-black text-white shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          <Save aria-hidden="true" className="relative z-10" size={20} />
          <span className="relative z-10">{submitting ? '修改中...' : '确认修改密码'}</span>
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0"
          />
        </button>
      </form>
    </section>
  );
}

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

function toPasswordChangeError(error: unknown): PasswordFormError {
  const message = error instanceof Error ? error.message : '';

  if (message === 'Current password is incorrect') {
    return { field: 'currentPassword', message: '当前密码错误。' };
  }

  if (message === 'New password must be at least 8 characters') {
    return { field: 'newPassword', message: '新密码至少需要 8 个字符。' };
  }

  if (message === 'Admin session required') {
    return { field: 'currentPassword', message: '管理员会话已失效，请重新登录。' };
  }

  return { field: 'newPassword', message: '管理员密码修改失败，请稍后重试。' };
}
