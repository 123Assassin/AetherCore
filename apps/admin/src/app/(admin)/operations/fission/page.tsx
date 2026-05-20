'use client';

import type {
  AdminFissionRewardConfig,
  AdminFissionRewardConfigUpdateInput,
  AdminInviteTreeNode,
} from '@package/shared';
import { Gift, Network, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { InviteTree } from '../../../../components/operations/invite-tree';
import { RewardConfigForm } from '../../../../components/operations/reward-config-form';
import { useTrpcClient } from '../../../../trpc/provider';

type ActiveTab = 'chain' | 'config';

export default function AdminFissionPage() {
  const client = useTrpcClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chain');
  const [inviteTree, setInviteTree] = useState<AdminInviteTreeNode[]>([]);
  const [rewardConfig, setRewardConfig] = useState<AdminFissionRewardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestSequence = useRef(0);

  const fetchFissionData = useCallback(async () => {
    const [tree, config] = await Promise.all([
      client.adminOperations.fission.inviteTree.query(),
      client.adminOperations.fission.rewardConfig.get.query(),
    ]);

    return { config, tree };
  }, [client]);

  useEffect(() => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    async function loadFissionData() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFissionData();

        if (requestId === requestSequence.current) {
          setInviteTree(result.tree);
          setRewardConfig(result.config);
        }
      } catch {
        if (requestId === requestSequence.current) {
          setError('裂变管理数据加载失败，请确认管理员会话和服务状态。');
        }
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadFissionData();
  }, [fetchFissionData]);

  async function handleRewardConfigSubmit(input: AdminFissionRewardConfigUpdateInput) {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitError(null);
    setSavedMessage(null);

    try {
      const nextConfig = await client.adminOperations.fission.rewardConfig.update.mutate(input);

      setRewardConfig(nextConfig);
    } catch {
      setSubmitError('奖励配置保存失败，请检查数值后重试。');
      setSubmitting(false);
      return;
    }

    try {
      const nextTree = await client.adminOperations.fission.inviteTree.query();

      setInviteTree(nextTree);
      setSavedMessage('奖励配置已保存。');
    } catch {
      setError('奖励配置已保存，但邀请链路刷新失败。');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRewardConfigDirty() {
    setSavedMessage(null);
    setSubmitError(null);
  }

  const rootInviteCount = inviteTree.reduce((total, node) => total + node.totalInvited, 0);
  const rootRewardEarned = inviteTree.reduce((total, node) => total + node.rewardEarned, 0);

  return (
    <main className="space-y-8">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            裂变管理
            <span className="rounded-md border border-purple-200/50 bg-purple-100 px-2 py-0.5 text-[10px] font-black tracking-widest text-purple-600 uppercase">
              Growth
            </span>
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            配置邀请奖励并发掘核心裂变用户链路
          </p>
        </div>

        <div className="flex rounded-2xl border border-slate-200/50 bg-slate-100 p-1.5 shadow-inner">
          <button
            aria-pressed={activeTab === 'chain'}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'chain'
                ? 'text-primary bg-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('chain')}
            type="button"
          >
            <Network size={16} />
            邀请链路
          </button>
          <button
            aria-pressed={activeTab === 'config'}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'config'
                ? 'text-primary bg-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('config')}
            type="button"
          >
            <Gift size={16} />
            奖励配置
          </button>
        </div>
      </header>

      <section aria-label="裂变概览" className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard label="根链路" loading={loading} value={inviteTree.length} />
        <SummaryCard label="直接邀请" loading={loading} value={rootInviteCount} />
        <SummaryCard label="已发奖励" loading={loading} value={rootRewardEarned} />
        <SummaryCard label="活动状态" textValue={rewardConfig?.isActive ? '开启' : '关闭'} />
      </section>

      {error ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {activeTab === 'chain' ? (
        <section
          aria-busy={loading}
          aria-label="邀请链路"
          className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <Network size={20} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">用户裂变树</h4>
              <p className="text-xs text-slate-500">查看用户的多级邀请关系及奖励贡献</p>
            </div>
          </div>

          {loading ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-400">
              正在加载邀请链路...
            </p>
          ) : (
            <InviteTree nodes={inviteTree} />
          )}
        </section>
      ) : null}

      {activeTab === 'config' ? (
        <section aria-busy={loading} aria-label="奖励配置" className="space-y-4">
          {loading ? (
            <p className="max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
              正在加载奖励配置...
            </p>
          ) : null}

          {!loading && rewardConfig ? (
            <RewardConfigForm
              config={rewardConfig}
              key={rewardConfig.updatedAt}
              onDirty={handleRewardConfigDirty}
              onSubmit={handleRewardConfigSubmit}
              submitError={submitError}
              submitting={submitting}
            />
          ) : null}

          {!loading && !rewardConfig ? (
            <p className="max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-400 shadow-sm">
              暂无奖励配置。
            </p>
          ) : null}

          {savedMessage ? (
            <p
              aria-live="polite"
              className="max-w-3xl rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600"
            >
              {savedMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  loading = false,
  textValue,
  value,
}: {
  label: string;
  loading?: boolean;
  textValue?: string;
  value?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
        <Share2 size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-slate-900">
          {textValue ?? (loading ? '...' : formatNumber(value ?? 0))}
        </p>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
