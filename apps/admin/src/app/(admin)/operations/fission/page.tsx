'use client';

import type {
  AdminFissionRewardConfig,
  AdminFissionRewardConfigUpdateInput,
  AdminInviteTreeNode,
} from '@package/shared';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

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
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Operations / Fission</p>
          <h2 style={styles.heading}>裂变管理</h2>
        </div>
        <div aria-label="裂变管理视图" style={styles.segmented}>
          <button
            aria-pressed={activeTab === 'chain'}
            onClick={() => setActiveTab('chain')}
            style={activeTab === 'chain' ? styles.segmentedActive : styles.segmentedButton}
            type="button"
          >
            邀请链路
          </button>
          <button
            aria-pressed={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
            style={activeTab === 'config' ? styles.segmentedActive : styles.segmentedButton}
            type="button"
          >
            奖励配置
          </button>
        </div>
      </header>

      <section aria-label="裂变概览" style={styles.summaryGrid}>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>{loading ? '...' : inviteTree.length}</strong>
          <span style={styles.summaryText}>条根链路</span>
        </div>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>{loading ? '...' : rootInviteCount}</strong>
          <span style={styles.summaryText}>直接邀请</span>
        </div>
        <div style={styles.summary}>
          <strong style={styles.summaryNumber}>{loading ? '...' : rootRewardEarned}</strong>
          <span style={styles.summaryText}>已发奖励</span>
        </div>
        <div style={styles.summary}>
          <strong style={rewardConfig?.isActive ? styles.activeSummary : styles.inactiveSummary}>
            {rewardConfig?.isActive ? '开启' : '关闭'}
          </strong>
          <span style={styles.summaryText}>活动状态</span>
        </div>
      </section>

      {error ? (
        <p aria-live="polite" role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}

      {activeTab === 'chain' ? (
        <section aria-busy={loading} aria-label="邀请链路" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>邀请链路</h2>
            <p style={styles.panelDescription}>查看用户多级邀请关系、邀请码和奖励贡献。</p>
          </div>

          {loading ? <p style={styles.stateText}>正在加载邀请链路...</p> : null}

          {!loading ? <InviteTree nodes={inviteTree} /> : null}
        </section>
      ) : null}

      {activeTab === 'config' ? (
        <section aria-busy={loading} aria-label="奖励配置" style={styles.configSection}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>奖励配置</h2>
            <p style={styles.panelDescription}>设置裂变活动状态、双方奖励额度和二级提成比例。</p>
          </div>

          {loading ? <p style={styles.stateText}>正在加载奖励配置...</p> : null}

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

          {!loading && !rewardConfig ? <p style={styles.stateText}>暂无奖励配置。</p> : null}

          {savedMessage ? (
            <p aria-live="polite" style={styles.success}>
              {savedMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '8px 12px',
} satisfies CSSProperties;

const styles = {
  activeSummary: {
    color: '#0f766e',
    fontSize: 20,
    lineHeight: '28px',
  },
  configSection: {
    display: 'grid',
    gap: 14,
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
  inactiveSummary: {
    color: '#64748b',
    fontSize: 20,
    lineHeight: '28px',
  },
  main: {
    display: 'grid',
    gap: 16,
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    padding: 18,
  },
  panelDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
  panelHeader: {
    display: 'grid',
    gap: 4,
  },
  panelTitle: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
  segmented: {
    border: '1px solid #c8d1dc',
    borderRadius: 6,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(96px, 1fr))',
    overflow: 'hidden',
  },
  segmentedActive: {
    ...buttonBase,
    background: '#0f766e',
    border: 0,
    color: '#ffffff',
    fontWeight: 700,
  },
  segmentedButton: {
    ...buttonBase,
    background: '#ffffff',
    border: 0,
    color: '#334155',
    fontWeight: 700,
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
    padding: '9px 11px',
  },
  summary: {
    alignItems: 'baseline',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'flex',
    gap: 6,
    padding: '10px 12px',
  },
  summaryGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  summaryNumber: {
    color: '#0f766e',
    fontSize: 22,
    lineHeight: '28px',
  },
  summaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: '18px',
  },
} satisfies Record<string, CSSProperties>;
