import type { AdminUserItem } from '@package/shared';
import { BadgeCheck, Ban, ShieldBan, Users as UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type UsersStatsProps = {
  loading: boolean;
  total: number;
  users: AdminUserItem[];
};

export function UsersStats({ loading, total, users }: UsersStatsProps) {
  const activeCount = users.filter(
    (user) => user.status === 'active' && !user.isBlacklisted
  ).length;
  const disabledCount = users.filter((user) => user.status === 'disabled').length;
  const blacklistedCount = users.filter((user) => user.isBlacklisted).length;

  return (
    <section aria-label="用户统计" className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <StatItem
        icon={<UsersIcon size={28} />}
        label="总用户数"
        loading={loading}
        tone="indigo"
        value={total}
      />
      <StatItem
        icon={<BadgeCheck size={28} />}
        label="活跃用户"
        loading={loading}
        tone="blue"
        value={activeCount}
      />
      <StatItem
        icon={<Ban size={28} />}
        label="限制用户"
        loading={loading}
        tone="amber"
        value={disabledCount}
      />
      <StatItem
        icon={<ShieldBan size={28} />}
        label="黑名单"
        loading={loading}
        tone="red"
        value={blacklistedCount}
      />
    </section>
  );
}

function StatItem({
  icon,
  label,
  loading,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  loading: boolean;
  tone: 'amber' | 'blue' | 'indigo' | 'red';
  value: number;
}) {
  return (
    <div className="group hover:border-primary/20 flex items-center gap-5 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm transition-all">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${
          toneClasses[tone]
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
          {loading ? '...' : formatNumber(value)}
        </p>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

const toneClasses = {
  amber: 'bg-amber-50 text-amber-500',
  blue: 'bg-blue-50 text-blue-500',
  indigo: 'bg-indigo-50 text-indigo-500',
  red: 'bg-red-50 text-red-500',
};
