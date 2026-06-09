'use client';

import {
  BookOpen,
  ChevronRight,
  FlaskConical as LabIcon,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

type FeatureCardProps = {
  color: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  tag?: string;
  title: string;
};

function FeatureCard({ color, description, icon, onClick, tag, title }: FeatureCardProps) {
  return (
    <button
      className="group relative flex flex-col rounded-[32px] border border-slate-100 bg-white p-8 text-left transition-all hover:-translate-y-1 hover:scale-[1.01] hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 active:scale-[0.98]"
      onClick={onClick}
      type="button"
    >
      <div
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${color} shadow-sm transition-transform duration-500 group-hover:scale-110`}
      >
        {icon}
      </div>

      {tag ? (
        <span className="absolute top-8 right-8 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-red-600 uppercase">
          {tag}
        </span>
      ) : null}

      <h3 className="mb-2 text-xl font-black tracking-tight text-slate-800 transition-colors group-hover:text-red-600">
        {title}
      </h3>
      <p className="mb-6 text-sm leading-relaxed font-medium text-slate-500">{description}</p>

      <div className="mt-auto flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase transition-all group-hover:text-slate-800">
        立即开启 <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const features = [
    {
      color: 'bg-blue-500',
      description: '将深奥概念转化为学生易懂的语言，支持多维度拆解与案例生成。',
      href: '/lesson/inspiration',
      icon: <BookOpen className="h-7 w-7 text-white" />,
      id: 'inspiration',
      title: '知识精讲',
    },
    {
      color: 'bg-emerald-500',
      description: '一键将常规题目变换为情境题、变式题，支持批量生成作业设计。',
      href: '/lesson/teaching',
      icon: <RefreshCw className="h-7 w-7 text-white" />,
      id: 'teaching',
      tag: 'HOT',
      title: '题目变身',
    },
    {
      color: 'bg-purple-500',
      description: '基于学生表现维度，快速构建个性化、有温度的期末或阶段性评语。',
      href: '/office/comment',
      icon: <MessageSquare className="h-7 w-7 text-white" />,
      id: 'comment',
      title: '评语助手',
    },
    {
      color: 'bg-amber-500',
      description: '设计富有创意的课堂互动实验与探究方案，提升学生的参与深度。',
      href: '/lesson/simulation',
      icon: <LabIcon className="h-7 w-7 text-white" />,
      id: 'simulation',
      title: '互动实验',
    },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-12">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-red-500" />
            <span className="text-xs font-black tracking-[0.3em] text-red-500 uppercase">
              Smart Toolkit
            </span>
          </div>
          <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900">
            专注教研，<span className="text-slate-400">更懂老师</span>
          </h2>
          <p className="text-lg font-medium text-slate-500">
            欢迎回到红笔助手。我们为您精选了四个核心模块，旨在将繁琐的文字工作转化为高效的教研创作。
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <FeatureCard
            color={feature.color}
            description={feature.description}
            icon={feature.icon}
            key={feature.id}
            onClick={() => router.push(feature.href)}
            title={feature.title}
            {...('tag' in feature ? { tag: feature.tag } : {})}
          />
        ))}
      </div>
    </div>
  );
}
