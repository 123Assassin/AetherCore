'use client';

import type { AdminAlarmConfig, AdminAlarmConfigUpdateInput } from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { AlarmConfigForm } from '../../../components/alarm/alarm-config-form';
import { useTrpcClient } from '../../../trpc/provider';

export default function AdminAlarmPage() {
  const client = useTrpcClient();
  const [config, setConfig] = useState<AdminAlarmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestSequence = useRef(0);

  const fetchAlarmConfig = useCallback(() => {
    return client.adminOperations.alarmConfig.get.query();
  }, [client]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadAlarmConfig() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAlarmConfig();

        if (requestId === requestSequence.current) {
          setConfig(result);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('消息告警配置加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadAlarmConfig();
  }, [fetchAlarmConfig]);

  async function handleSubmit(input: AdminAlarmConfigUpdateInput) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitError(null);
    setSavedMessage(null);

    try {
      const nextConfig = await client.adminOperations.alarmConfig.update.mutate(input);

      setConfig(nextConfig);
      setSavedMessage('消息告警配置已保存。');
    } catch {
      setSubmitError('消息告警配置保存失败，请检查阈值和邮箱后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDirty() {
    setSubmitError(null);
    setSavedMessage(null);
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Alarm</p>
          <h2 style={styles.heading}>消息告警中心</h2>
        </div>
      </header>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="消息告警配置" style={styles.section}>
        {loading ? <p style={styles.stateText}>正在加载消息告警配置...</p> : null}

        {!loading && config ? (
          <AlarmConfigForm
            config={config}
            key={config.updatedAt}
            onDirty={handleDirty}
            onSubmit={handleSubmit}
            submitError={submitError}
            submitting={submitting}
          />
        ) : null}

        {!loading && !config ? <p style={styles.stateText}>暂无消息告警配置。</p> : null}

        {savedMessage ? (
          <p aria-live="polite" style={styles.success}>
            {savedMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}

const styles = {
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
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  heading: {
    color: '#172033',
    fontSize: 24,
    lineHeight: '32px',
    margin: 0,
  },
  main: {
    display: 'grid',
    gap: 16,
  },
  section: {
    display: 'grid',
    gap: 12,
  },
  stateText: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
    padding: 18,
  },
  success: {
    background: '#ecfdf5',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    color: '#166534',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    maxWidth: 680,
    padding: '9px 11px',
  },
} satisfies Record<string, CSSProperties>;
