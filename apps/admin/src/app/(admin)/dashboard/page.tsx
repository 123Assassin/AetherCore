'use client';

import { Activity, Clock, LayoutDashboard, Users, Zap } from 'lucide-react';

import { DashboardStatCard } from '../../../components/dashboard/dashboard-stat-card';
import {
  type TrafficSourceItem,
  TrafficSourceList,
} from '../../../components/dashboard/traffic-source-list';

const overviewMetrics = [
  {
    bg: 'bg-green-50',
    change: 'Real-time',
    color: 'text-green-500',
    icon: Activity,
    label: '当前在线人数',
    pulse: true,
    value: '1,248',
  },
  {
    bg: 'bg-indigo-50',
    change: '+8.6%',
    color: 'text-indigo-500',
    icon: Zap,
    label: '今日模型 Token 消耗',
    value: '3.82M',
  },
  {
    bg: 'bg-purple-50',
    change: '+5.4%',
    color: 'text-purple-500',
    icon: Users,
    label: '独立访客数 (UV)',
    value: '18,420',
  },
  {
    bg: 'bg-amber-50',
    change: '-2.1%',
    color: 'text-amber-500',
    icon: Clock,
    isPositive: false,
    label: '平均访问时长',
    value: '06:42',
  },
] as const;

const trafficSources: TrafficSourceItem[] = [
  { label: '自然搜索', ratio: 36, visits: '6,631' },
  { label: '课程分享链接', ratio: 24, visits: '4,421' },
  { label: '学校工作台', ratio: 18, visits: '3,316' },
  { label: '直接访问', ratio: 14, visits: '2,579' },
  { label: '活动页入口', ratio: 8, visits: '1,473' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">数据看板</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            实时监控系统访问情况与核心性能指标
          </p>
        </div>
      </div>

      <section
        aria-label="后台概览指标"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {overviewMetrics.map((metric, index) => (
          <DashboardStatCard index={index} key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm lg:col-span-2">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <LayoutDashboard size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-800">访问趋势图表区</h4>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            预留图表组件位置。您可以集成 Recharts 或 Echarts 渲染24小时内的 PV/UV 趋势折线图。
          </p>
        </div>

        <TrafficSourceList items={trafficSources} />
      </section>
    </div>
  );
}
