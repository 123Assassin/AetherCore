import type { AdminActivityItem } from '@package/shared';
import { Activity, Clock, Edit3, ShieldCheck, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

type ActivityNoticeListItemProps = {
  deleting?: boolean;
  item: AdminActivityItem;
  onDelete: (item: AdminActivityItem) => void;
  onEdit: (item: AdminActivityItem) => void;
};

export function ActivityNoticeListItem({
  deleting = false,
  item,
  onDelete,
  onEdit,
}: ActivityNoticeListItemProps) {
  const displayDate = item.publishedAt ?? item.createdAt;

  return (
    <motion.article
      className="group flex items-start gap-6 p-8 transition-colors hover:bg-slate-50"
      layout
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${
          item.status === 'published'
            ? 'border-blue-100 bg-blue-50 text-blue-600'
            : 'border-slate-100 bg-slate-50 text-slate-400'
        }`}
      >
        <Activity className={item.status === 'published' ? 'animate-pulse' : ''} size={22} />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="group-hover:text-primary text-lg font-extrabold tracking-tight text-slate-900 transition-colors">
            {item.title}
          </h4>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-black tracking-widest uppercase ${
              item.status === 'published'
                ? 'border border-green-100 bg-green-50 text-green-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {item.status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          {item.content}
        </p>
        <div className="flex items-center gap-4 pt-2 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5 tracking-wider uppercase">
            <Clock size={12} />
            {formatDateTime(displayDate)}
          </span>
          <span className="flex items-center gap-1.5 tracking-wider uppercase">
            <ShieldCheck size={12} />
            管理员操作
          </span>
        </div>
      </div>

      <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button
          aria-label={`编辑活动通告 ${item.title}`}
          className="hover:text-primary rounded-xl p-3 text-slate-400 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={deleting}
          onClick={() => onEdit(item)}
          type="button"
        >
          <Edit3 size={20} />
        </button>
        <button
          aria-label={`删除活动通告 ${item.title}`}
          className="rounded-xl p-3 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={deleting}
          onClick={() => onDelete(item)}
          type="button"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </motion.article>
  );
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
