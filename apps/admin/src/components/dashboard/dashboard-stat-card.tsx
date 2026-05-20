import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

type DashboardStatCardProps = {
  bg: string;
  change: string;
  color: string;
  icon: LucideIcon;
  index: number;
  isPositive?: boolean;
  label: string;
  pulse?: boolean;
  value: string;
};

export function DashboardStatCard({
  bg,
  change,
  color,
  icon: Icon,
  index,
  isPositive = true,
  label,
  pulse = false,
  value,
}: DashboardStatCardProps) {
  const realTime = change === 'Real-time';

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="group hover:border-primary/20 relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition-colors"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="mb-6 flex items-start justify-between">
        <div
          className={`${bg} ${color} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl`}
        >
          <Icon className={pulse ? 'animate-pulse' : ''} size={24} />
        </div>
        <div
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase ${
            realTime
              ? 'bg-slate-100 text-slate-500'
              : isPositive
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
          }`}
        >
          {!realTime && (isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
          {change}
        </div>
      </div>

      <div>
        <strong className="block text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </strong>
        <p className="mt-1 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          {label}
        </p>
      </div>

      <div
        aria-hidden="true"
        className={`${bg} pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-50`}
      />
    </motion.article>
  );
}
