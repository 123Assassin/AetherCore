'use client';

import type { AdminInviteTreeNode } from '@package/shared';
import { type CSSProperties, useState } from 'react';

type InviteTreeProps = {
  expandedIds?: ReadonlySet<string>;
  nodes: AdminInviteTreeNode[];
  onToggle?: (id: string) => void;
};

export function InviteTree({ expandedIds, nodes, onToggle }: InviteTreeProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(nodes.slice(0, 1).map((node) => node.id))
  );
  const activeExpandedIds = expandedIds ?? internalExpandedIds;

  function handleToggle(id: string) {
    if (onToggle) {
      onToggle(id);
      return;
    }

    setInternalExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  if (nodes.length === 0) {
    return <p style={styles.stateText}>暂无邀请链路。</p>;
  }

  return (
    <div style={styles.tree}>
      {nodes.map((node) => (
        <InviteTreeNode
          expandedIds={activeExpandedIds}
          key={node.id}
          level={0}
          node={node}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

type InviteTreeNodeProps = {
  expandedIds: ReadonlySet<string>;
  level: number;
  node: AdminInviteTreeNode;
  onToggle: (id: string) => void;
};

function InviteTreeNode({ expandedIds, level, node, onToggle }: InviteTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const displayName = node.name?.trim() || '未命名用户';
  const rowStyle = {
    ...styles.nodeRow,
    marginLeft: level > 0 ? Math.min(level * 22, 88) : 0,
  };

  return (
    <div style={styles.nodeBlock}>
      <div style={rowStyle}>
        {hasChildren ? (
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? '收起' : '展开'} ${node.email} 的下级邀请`}
            onClick={() => onToggle(node.id)}
            style={styles.toggleButton}
            type="button"
          >
            {expanded ? '-' : '+'}
          </button>
        ) : (
          <span aria-hidden="true" style={styles.leafIcon} />
        )}

        <span style={styles.identity}>
          <strong style={styles.email}>{node.email}</strong>
          <span style={styles.name}>{displayName}</span>
          <span style={styles.inviteCode}>{node.inviteCode ?? '无邀请码'}</span>
        </span>

        <span style={styles.metrics}>
          <span style={styles.metric}>
            <span style={styles.metricLabel}>邀请数</span>
            <strong style={styles.metricValue}>{node.totalInvited}</strong>
          </span>
          <span style={styles.metric}>
            <span style={styles.metricLabel}>奖励</span>
            <strong style={styles.rewardValue}>{node.rewardEarned}</strong>
          </span>
          <span style={styles.metric}>
            <span style={styles.metricLabel}>下级</span>
            <strong style={styles.metricValue}>{node.children.length}</strong>
          </span>
        </span>
      </div>

      {hasChildren && expanded ? (
        <div style={styles.children}>
          {node.children.map((child) => (
            <InviteTreeNode
              expandedIds={expandedIds}
              key={child.id}
              level={level + 1}
              node={child}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  children: {
    display: 'grid',
    gap: 8,
    marginTop: 8,
  },
  email: {
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  identity: {
    display: 'grid',
    gap: 3,
    minWidth: 0,
    textAlign: 'left',
  },
  inviteCode: {
    color: '#64748b',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    lineHeight: '16px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  leafIcon: {
    background: '#f1f5f9',
    borderRadius: 6,
    flex: '0 0 auto',
    height: 24,
    width: 24,
  },
  metric: {
    display: 'grid',
    gap: 2,
    minWidth: 58,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: '14px',
    whiteSpace: 'nowrap',
  },
  metricValue: {
    color: '#172033',
    fontSize: 13,
    lineHeight: '18px',
  },
  metrics: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(3, minmax(58px, auto))',
    justifyContent: 'end',
    textAlign: 'right',
  },
  name: {
    color: '#475569',
    fontSize: 12,
    lineHeight: '16px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nodeBlock: {
    display: 'grid',
  },
  nodeRow: {
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    display: 'grid',
    gap: 12,
    gridTemplateColumns: '24px minmax(0, 1fr) auto',
    minWidth: 0,
    padding: 12,
    textAlign: 'left',
  },
  rewardValue: {
    color: '#0f766e',
    fontSize: 13,
    lineHeight: '18px',
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
  toggleButton: {
    alignItems: 'center',
    background: '#e6f4f1',
    border: '1px solid #99d6cc',
    borderRadius: 6,
    color: '#0f766e',
    cursor: 'pointer',
    display: 'inline-flex',
    flex: '0 0 auto',
    fontSize: 16,
    fontWeight: 700,
    height: 24,
    justifyContent: 'center',
    lineHeight: '20px',
    width: 24,
  },
  tree: {
    display: 'grid',
    gap: 8,
    overflowX: 'auto',
  },
} satisfies Record<string, CSSProperties>;
