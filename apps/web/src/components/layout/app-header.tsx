'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { WeChatLoginModal } from '../auth/wechat-login-modal';

const routeTitles = [
  { href: '/chat', title: '对话' },
  { href: '/lesson/inspiration', title: '灵感课程' },
  { href: '/lesson/simulation', title: '仿真实训' },
  { href: '/office/comment', title: '评语办公' },
  { href: '/office/teaching', title: '教案办公' },
] as const;

function getRouteTitle(pathname: string) {
  const match = routeTitles.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`)
  );

  return match?.title ?? 'AetherCore';
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getRouteTitle(pathname);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="app-header__title">
          <div className="app-header__eyebrow">当前工作区</div>
          <h1 className="app-header__heading">{title}</h1>
        </div>
        <div className="app-header__actions">
          <div aria-label="当前路径" className="app-header__route">
            {pathname}
          </div>
          <button
            className="app-header__login-button"
            onClick={() => setLoginOpen(true)}
            type="button"
          >
            微信登录
          </button>
        </div>
      </header>
      {loginOpen ? <WeChatLoginModal onClose={() => setLoginOpen(false)} open /> : null}
    </>
  );
}
