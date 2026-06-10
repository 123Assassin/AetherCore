'use client';

import { Clock, Save, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

type LoginTimeoutFormState = {
  adminIdleTimeoutMinutes: string;
  webIdleTimeoutMinutes: string;
};

type LoginTimeoutFormError = {
  field: keyof LoginTimeoutFormState;
  message: string;
};

const emptyForm: LoginTimeoutFormState = {
  adminIdleTimeoutMinutes: '120',
  webIdleTimeoutMinutes: '10080',
};

const errorId = 'login-timeout-settings-error';

export function LoginTimeoutSettingsForm() {
  const client = useTrpcClient();
  const [form, setForm] = useState<LoginTimeoutFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoginTimeoutFormError | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      setLoading(true);
      setLoadError(null);

      try {
        const config = await client.adminOperations.systemConfig.get.query();

        if (mounted) {
          setForm({
            adminIdleTimeoutMinutes: String(config.adminIdleTimeoutMinutes),
            webIdleTimeoutMinutes: String(config.webIdleTimeoutMinutes),
          });
        }
      } catch {
        if (mounted) {
          setLoadError('登录时效配置加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      mounted = false;
    };
  }, [client]);

  function updateField(field: keyof LoginTimeoutFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const adminIdleTimeoutMinutes = parsePositiveInteger(form.adminIdleTimeoutMinutes);
    const webIdleTimeoutMinutes = parsePositiveInteger(form.webIdleTimeoutMinutes);

    if (adminIdleTimeoutMinutes === null) {
      setError({ field: 'adminIdleTimeoutMinutes', message: 'admin端登录时效必须是正整数。' });
      setSuccess(false);
      return;
    }

    if (webIdleTimeoutMinutes === null) {
      setError({ field: 'webIdleTimeoutMinutes', message: 'web端登录时效必须是正整数。' });
      setSuccess(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const config = await client.adminOperations.systemConfig.update.mutate({
        adminIdleTimeoutMinutes,
        webIdleTimeoutMinutes,
      });
      setForm({
        adminIdleTimeoutMinutes: String(config.adminIdleTimeoutMinutes),
        webIdleTimeoutMinutes: String(config.webIdleTimeoutMinutes),
      });
      setSuccess(true);
    } catch {
      setError({ field: 'adminIdleTimeoutMinutes', message: '登录时效配置保存失败，请稍后重试。' });
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="login-timeout-settings-title"
      className="relative space-y-12 overflow-hidden rounded-[48px] border border-slate-200 bg-white p-12 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="bg-primary/5 absolute top-0 right-0 h-48 w-48 rounded-bl-[150px]"
      />

      <div className="relative flex items-center gap-5">
        <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-[24px] shadow-inner">
          <Clock aria-hidden="true" size={32} />
        </div>
        <div>
          <h2
            className="text-3xl font-black tracking-tight text-slate-900"
            id="login-timeout-settings-title"
          >
            登录时效
          </h2>
          <p className="text-sm font-medium text-slate-500">配置无操作自动登出的时间窗口</p>
        </div>
      </div>

      {loadError ? (
        <p
          aria-live="polite"
          className="relative rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

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
          登录时效配置已保存。
        </p>
      ) : null}

      <form className="relative space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <label className="block space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              admin端登录时效
            </span>
            <div className="relative">
              <input
                aria-describedby={error?.field === 'adminIdleTimeoutMinutes' ? errorId : undefined}
                aria-invalid={error?.field === 'adminIdleTimeoutMinutes'}
                className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 pr-20 font-mono text-lg transition-all outline-none focus:ring-4"
                disabled={loading || submitting}
                inputMode="numeric"
                onChange={(event) =>
                  updateField('adminIdleTimeoutMinutes', readInputValue(event.currentTarget))
                }
                type="text"
                value={form.adminIdleTimeoutMinutes}
              />
              <span className="pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 text-xs font-black tracking-widest text-slate-400">
                分钟
              </span>
            </div>
          </label>

          <label className="block space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              web端登录时效
            </span>
            <div className="relative">
              <input
                aria-describedby={error?.field === 'webIdleTimeoutMinutes' ? errorId : undefined}
                aria-invalid={error?.field === 'webIdleTimeoutMinutes'}
                className="focus:ring-primary/10 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-8 py-5 pr-20 font-mono text-lg transition-all outline-none focus:ring-4"
                disabled={loading || submitting}
                inputMode="numeric"
                onChange={(event) =>
                  updateField('webIdleTimeoutMinutes', readInputValue(event.currentTarget))
                }
                type="text"
                value={form.webIdleTimeoutMinutes}
              />
              <span className="pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 text-xs font-black tracking-widest text-slate-400">
                分钟
              </span>
            </div>
          </label>
        </div>

        <button
          className="bg-primary hover:bg-primary-dark shadow-primary/30 group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[28px] px-12 py-5 font-black text-white shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || submitting}
          type="submit"
        >
          <Save aria-hidden="true" className="relative z-10" size={20} />
          <span className="relative z-10">{submitting ? '保存中...' : '保存登录时效'}</span>
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0"
          />
        </button>
      </form>
    </section>
  );
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const number = Number(trimmed);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
