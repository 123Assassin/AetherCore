'use client';

import { usePathname } from 'next/navigation';

const titleMap: Record<string, string> = {
  '/dashboard': '数据看板',
  '/resources/agents': '智能体管理',
  '/resources/prompts': 'AI Prompt管理',
  '/resources/sensitive-words': '敏感词库管理',
  '/simulations': '仿真案例库管理',
  '/engine-dispatch': '引擎调度中心',
  '/operations/activities': '活动管理',
  '/operations/fission': '裂变管理',
  '/security/system-audit': '系统审计日志',
  '/security/content-audit': 'AI内容审计',
  '/security/traffic-monitor': '流量监控',
  '/alarm': '消息告警中心',
  '/users': '用户管理控制台',
  '/settings': '系统设置',
};

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-10 backdrop-blur-xl">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
        {getRouteTitle(pathname)}
      </h2>
    </header>
  );
}

function getRouteTitle(pathname: string): string {
  const matchingRoute = Object.entries(titleMap).find(
    ([href]) => pathname === href || pathname.startsWith(`${href}/`)
  );

  return matchingRoute?.[1] ?? '仪表盘';
}
