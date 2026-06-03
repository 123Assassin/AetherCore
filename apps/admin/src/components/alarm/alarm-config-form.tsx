'use client';

import type { AdminAlarmConfig, AdminAlarmConfigUpdateInput } from '@package/shared';
import { AlertTriangle, Mail, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';

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
    <form
      className="max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="space-y-8 p-8">
        <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-orange-800">
          <AlertTriangle aria-hidden="true" className="shrink-0 text-orange-500" size={24} />
          <p className="text-sm font-medium">
            当任何模型引擎的日消耗金额超过设定阈值时，系统将主动发送告警邮件。
          </p>
        </div>

        <div className="space-y-6">
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              费用告警阈值 ({config.currency})
            </span>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-slate-400">
                ¥
              </span>
              <input
                className="focus:ring-primary/10 focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-8 font-mono transition-all outline-none focus:ring-4 disabled:opacity-60"
                disabled={submitting}
                min="0"
                onChange={(event) =>
                  updateForm({ threshold: readControlValue(event.currentTarget) })
                }
                placeholder="例如：100"
                step="0.01"
                type="number"
                value={form.threshold}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              通知邮箱
            </span>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="focus:ring-primary/10 focus:border-primary w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-11 transition-all outline-none focus:ring-4 disabled:opacity-60"
                disabled={submitting}
                onChange={(event) => updateForm({ email: readControlValue(event.currentTarget) })}
                placeholder="admin@example.com"
                type="email"
                value={form.email}
              />
            </div>
          </label>

          {error ? (
            <p
              aria-live="polite"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {submitError ? (
            <p
              aria-live="polite"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <div className="pt-4">
            <button
              className="bg-primary hover:bg-primary-dark shadow-primary/30 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={submitting}
              type="submit"
            >
              <Save aria-hidden="true" size={20} />
              {submitting ? '保存中...' : '保存告警配置'}
            </button>
          </div>
        </div>
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
