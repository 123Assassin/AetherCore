'use client';

import type {
  AdminFissionRewardConfig,
  AdminFissionRewardConfigUpdateInput,
} from '@package/shared';
import { type CSSProperties, type FormEvent, useState } from 'react';

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
    <form onSubmit={handleSubmit} style={styles.form}>
      <section style={styles.switchPanel}>
        <div style={styles.switchText}>
          <h2 style={styles.panelTitle}>活动状态</h2>
          <p style={styles.description}>开启后分享链接及邀请码正式生效。</p>
        </div>
        <label style={styles.switchLabel}>
          <input
            checked={form.isActive}
            disabled={submitting}
            onChange={(event) =>
              updateForm({
                isActive: readControlChecked(event.currentTarget),
              })
            }
            type="checkbox"
          />
          <span>{form.isActive ? '已开启' : '已关闭'}</span>
        </label>
      </section>

      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>邀请者奖励额度</span>
          <input
            disabled={submitting}
            min="0"
            onChange={(event) =>
              updateForm({
                inviterQuota: readControlValue(event.currentTarget),
              })
            }
            style={styles.input}
            type="number"
            value={form.inviterQuota}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>受邀者奖励额度</span>
          <input
            disabled={submitting}
            min="0"
            onChange={(event) =>
              updateForm({
                inviteeQuota: readControlValue(event.currentTarget),
              })
            }
            style={styles.input}
            type="number"
            value={form.inviteeQuota}
          />
        </label>
      </div>

      <section style={styles.switchPanel}>
        <div style={styles.switchText}>
          <h2 style={styles.panelTitle}>二级分销奖励</h2>
          <p style={styles.description}>开启后可配置二级邀请奖励比例。</p>
        </div>
        <label style={styles.switchLabel}>
          <input
            checked={form.enableMultiTier}
            disabled={submitting}
            onChange={(event) =>
              updateForm({
                enableMultiTier: readControlChecked(event.currentTarget),
              })
            }
            type="checkbox"
          />
          <span>{form.enableMultiTier ? '已开启' : '已关闭'}</span>
        </label>
      </section>

      <label style={styles.field}>
        <span style={styles.label}>二级提成比例</span>
        <input
          disabled={submitting}
          min="0"
          onChange={(event) =>
            updateForm({
              tier2RewardPct: readControlValue(event.currentTarget),
            })
          }
          style={styles.input}
          type="number"
          value={form.tier2RewardPct}
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
          {submitting ? '保存中...' : '保存奖励配置'}
        </button>
      </div>
    </form>
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
  description: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
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
    gap: 16,
    maxWidth: 720,
    padding: 18,
  },
  grid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
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
  panelTitle: {
    color: '#172033',
    fontSize: 16,
    lineHeight: '22px',
    margin: 0,
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  switchLabel: {
    alignItems: 'center',
    color: '#334155',
    display: 'flex',
    flex: '0 0 auto',
    fontSize: 13,
    fontWeight: 700,
    gap: 8,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  switchPanel: {
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  switchText: {
    display: 'grid',
    gap: 4,
  },
} satisfies Record<string, CSSProperties>;
