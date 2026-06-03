'use client';

import type {
  AdminFissionRewardConfig,
  AdminFissionRewardConfigUpdateInput,
} from '@package/shared';
import { Gift, Plus, Save } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useState } from 'react';

type RewardConfigFormProps = {
  config: AdminFissionRewardConfig;
  onDirty?: () => void;
  onSubmit: (input: AdminFissionRewardConfigUpdateInput) => Promise<void>;
  submitError?: string | null;
  submitting?: boolean;
};

type RewardConfigFormState = {
  enableMultiTier: boolean;
  inviteeQuota: string;
  inviterQuota: string;
  isActive: boolean;
  tier2RewardPct: string;
};

export function RewardConfigForm({
  config,
  onDirty,
  onSubmit,
  submitError,
  submitting = false,
}: RewardConfigFormProps) {
  const [form, setForm] = useState<RewardConfigFormState>(() => toFormState(config));
  const [error, setError] = useState<string | null>(null);

  function updateForm(patch: Partial<RewardConfigFormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    onDirty?.();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseRewardConfigForm(form);

    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }

    setError(null);
    await onSubmit(parsed.input);
  }

  return (
    <form
      className="max-w-3xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="mb-10 flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Gift size={24} />
        </div>
        <div>
          <h4 className="text-xl font-black text-slate-900">裂变奖励规则</h4>
          <p className="text-sm text-slate-500">动态调整邀请双方的额度奖励及多级提成</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <div>
            <p className="font-bold text-slate-900">活动状态</p>
            <p className="text-xs text-slate-500">开启后分享链接及邀请码正式生效</p>
          </div>
          <Switch
            checked={form.isActive}
            disabled={submitting}
            onChange={(checked) => updateForm({ isActive: checked })}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <label className="space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              邀请者奖励 (Quota)
            </span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <Plus size={16} />
              </div>
              <input
                className="focus:ring-primary/10 w-full rounded-[20px] border border-slate-200 bg-slate-50 py-4 pr-4 pl-10 font-bold text-slate-800 transition-all outline-none focus:ring-4"
                disabled={submitting}
                min="0"
                onChange={(event) =>
                  updateForm({ inviterQuota: readControlValue(event.currentTarget) })
                }
                type="number"
                value={form.inviterQuota}
              />
            </div>
          </label>

          <label className="space-y-3">
            <span className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              受邀者奖励 (Quota)
            </span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <Plus size={16} />
              </div>
              <input
                className="focus:ring-primary/10 w-full rounded-[20px] border border-slate-200 bg-slate-50 py-4 pr-4 pl-10 font-bold text-slate-800 transition-all outline-none focus:ring-4"
                disabled={submitting}
                min="0"
                onChange={(event) =>
                  updateForm({ inviteeQuota: readControlValue(event.currentTarget) })
                }
                type="number"
                value={form.inviteeQuota}
              />
            </div>
          </label>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900">二级分销奖励</p>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-600 uppercase">
                高级
              </span>
            </div>
            <Switch
              checked={form.enableMultiTier}
              disabled={submitting}
              onChange={(checked) => updateForm({ enableMultiTier: checked })}
              tone="amber"
            />
          </div>
          <p className="mb-6 text-sm text-slate-500">
            当邀请者邀请的用户再次邀请新用户时，原始邀请者可获得的额外奖励比例。
          </p>

          <AnimatePresence initial={false}>
            {form.enableMultiTier ? (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
                  <div className="flex-1 space-y-2">
                    <label className="ml-1 text-[10px] font-black tracking-widest text-amber-700/60 uppercase">
                      提成比例 (%)
                    </label>
                    <input
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-amber-200 accent-amber-500"
                      disabled={submitting}
                      max="100"
                      min="0"
                      onChange={(event) =>
                        updateForm({ tier2RewardPct: readControlValue(event.currentTarget) })
                      }
                      step="1"
                      type="range"
                      value={form.tier2RewardPct}
                    />
                  </div>
                  <div className="w-20 rounded-xl border border-amber-100 bg-white py-2 text-center text-2xl font-black text-amber-600 shadow-sm">
                    {form.tier2RewardPct}%
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {submitError ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <button
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 font-black text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          <Save size={20} />
          {submitting ? '保存中...' : '保存奖励规则'}
        </button>
      </div>
    </form>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  tone = 'primary',
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  tone?: 'amber' | 'primary';
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => onChange(readControlChecked(event.currentTarget))}
        type="checkbox"
      />
      <span
        className={`h-7 w-14 rounded-full bg-slate-200 shadow-inner after:absolute after:top-[2px] after:left-[2px] after:h-6 after:w-6 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white ${
          tone === 'amber' ? 'peer-checked:bg-amber-500' : 'peer-checked:bg-primary'
        }`}
      />
    </label>
  );
}

function toFormState(config: AdminFissionRewardConfig): RewardConfigFormState {
  return {
    enableMultiTier: config.enableMultiTier,
    inviteeQuota: String(config.inviteeQuota),
    inviterQuota: String(config.inviterQuota),
    isActive: config.isActive,
    tier2RewardPct: String(config.tier2RewardPct),
  };
}

function parseRewardConfigForm(
  form: RewardConfigFormState
): { error: string } | { input: AdminFissionRewardConfigUpdateInput } {
  const inviterQuota = parseNonNegativeInteger(form.inviterQuota);
  const inviteeQuota = parseNonNegativeInteger(form.inviteeQuota);
  const tier2RewardPct = parseNonNegativeInteger(form.tier2RewardPct);

  if (inviterQuota === null) {
    return { error: '邀请者奖励额度必须是非负整数。' };
  }

  if (inviteeQuota === null) {
    return { error: '受邀者奖励额度必须是非负整数。' };
  }

  if (tier2RewardPct === null) {
    return { error: '二级提成比例必须是非负整数。' };
  }

  if (tier2RewardPct > 100) {
    return { error: '二级提成比例不能超过 100。' };
  }

  return {
    input: {
      enableMultiTier: form.enableMultiTier,
      inviteeQuota,
      inviterQuota,
      isActive: form.isActive,
      tier2RewardPct,
    },
  };
}

function parseNonNegativeInteger(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsed = Number(trimmedValue);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function readControlValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}

function readControlChecked(target: EventTarget): boolean {
  return Boolean((target as { checked?: unknown }).checked);
}
