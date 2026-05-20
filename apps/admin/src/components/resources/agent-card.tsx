'use client';

import type { AdminAgentItem } from '@package/shared';
import { Cpu, Settings2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

type AgentCardProps = {
  deleting?: boolean;
  engineName: string;
  item: AdminAgentItem;
  onDelete: (item: AdminAgentItem) => void;
  onEdit: (item: AdminAgentItem) => void;
  promptTitle: string;
  sensitiveListName: string;
};

export function AgentCard({
  deleting = false,
  engineName,
  item,
  onDelete,
  onEdit,
  promptTitle,
  sensitiveListName,
}: AgentCardProps) {
  const enabled = item.status === 'enabled';

  return (
    <motion.article
      className="group hover:border-primary/20 relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-2xl"
      layout
    >
      <div className="mb-8 flex items-start justify-between">
        <div className="text-primary group-hover:bg-primary group-hover:shadow-primary/30 flex h-14 w-14 items-center justify-center rounded-[22px] border border-slate-100 bg-slate-50 shadow-sm transition-all duration-500 group-hover:text-white group-hover:shadow-lg">
          <Cpu size={28} />
        </div>
        <div className="flex gap-1.5 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
          <button
            aria-label={`编辑智能体 ${item.name}`}
            className="hover:text-primary rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100"
            onClick={() => onEdit(item)}
            type="button"
          >
            <Settings2 size={18} />
          </button>
          <button
            aria-label={`删除智能体 ${item.name}`}
            className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleting}
            onClick={() => onDelete(item)}
            type="button"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h4 className="group-hover:text-primary truncate text-lg font-bold text-slate-900 transition-colors">
            {item.name}
          </h4>
          <div className="mt-2 flex items-center gap-1.5 text-slate-400">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                enabled ? 'animate-pulse bg-green-500' : 'bg-slate-300'
              }`}
            />
            <span className="truncate font-mono text-xs tracking-tight">
              {agentKeyLabels[item.key]} / {engineName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">温度</p>
            <p className="text-sm font-bold text-slate-700">{item.temperature}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Top-P</p>
            <p className="text-sm font-bold text-slate-700">{item.topP}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
          <ResourceLine label="Prompt" value={promptTitle} />
          <ResourceLine label="敏感词库" value={sensitiveListName} />
          <ResourceLine label="Max Tokens" value={String(item.maxTokens)} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
        <span
          className={`rounded-lg border px-3 py-1 text-[10px] font-black tracking-widest uppercase ${
            enabled
              ? 'border-blue-100/50 bg-blue-50 text-blue-600'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          {enabled ? '运行中' : '已停止'}
        </span>
        <span className="text-[10px] font-bold text-slate-400 italic">
          {formatDate(item.createdAt)}
        </span>
      </div>
    </motion.article>
  );
}

function ResourceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 font-bold text-slate-400">{label}</span>
      <span className="truncate font-semibold text-slate-600">{value}</span>
    </div>
  );
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(timestamp);
}

const agentKeyLabels: Record<AdminAgentItem['key'], string> = {
  chat: '对话智能体',
  comment: '点评智能体',
  inspiration: '灵感智能体',
  teaching: '教学智能体',
};
