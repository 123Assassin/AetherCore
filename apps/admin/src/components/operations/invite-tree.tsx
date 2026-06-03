'use client';

import type { AdminInviteTreeNode } from '@package/shared';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

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
    return (
      <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-400">
        暂无邀请链路。
      </p>
    );
  }

  return (
    <div className="space-y-1">
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
  const displayName = node.name?.trim() || node.email;

  return (
    <div className="select-none">
      <div
        className={`flex cursor-pointer items-center gap-4 rounded-xl border border-transparent px-4 py-3 transition-all duration-200 hover:bg-slate-50 ${
          level > 0
            ? 'relative ml-8 before:absolute before:top-1/2 before:left-[-16px] before:h-px before:w-4 before:bg-slate-200'
            : ''
        } ${expanded && hasChildren ? 'bg-slate-50' : ''}`}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <button
          aria-expanded={expanded}
          aria-label={`${expanded ? '收起' : '展开'} ${node.email} 的下级邀请`}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
            hasChildren ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-300'
          }`}
          disabled={!hasChildren}
          onClick={(event) => {
            event.stopPropagation();

            if (hasChildren) {
              onToggle(node.id);
            }
          }}
          type="button"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <User size={12} />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 uppercase">
                {node.inviteCode ?? '无邀请码'}
              </span>
              <span className="truncate text-[10px] font-semibold text-slate-400">
                {node.email}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Invited
              </p>
              <p className="text-sm font-bold text-slate-700">{node.totalInvited}</p>
            </div>
            <div className="w-24">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Reward
              </p>
              <p className="text-sm font-bold text-green-600">+{node.rewardEarned}</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && expanded ? (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className="relative mt-1 overflow-hidden before:absolute before:top-0 before:bottom-4 before:left-7 before:w-px before:bg-slate-200"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
          >
            {node.children.map((child) => (
              <InviteTreeNode
                expandedIds={expandedIds}
                key={child.id}
                level={level + 1}
                node={child}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
