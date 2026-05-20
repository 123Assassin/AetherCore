'use client';

import type { AdminAlarmConfig, AdminAlarmConfigUpdateInput } from '@package/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    <main className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">消息告警中心</h1>
          <p className="mt-1 text-sm text-slate-500">配置模型费用消耗告警阈值及通知方式</p>
        </div>
      </header>

      {error ? (
        <p
          aria-live="polite"
          className="max-w-2xl rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section aria-busy={loading} aria-label="消息告警配置">
        {loading ? (
          <p className="max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            正在加载消息告警配置...
          </p>
        ) : null}

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

        {!loading && !config ? (
          <p className="max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500 shadow-sm">
            暂无消息告警配置。
          </p>
        ) : null}

        {savedMessage ? (
          <p
            aria-live="polite"
            className="mt-4 max-w-2xl rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-600"
          >
            {savedMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
