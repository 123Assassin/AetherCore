'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/chat', label: '对话' },
  { href: '/lesson/inspiration', label: '灵感课程' },
  { href: '/lesson/simulation', label: '仿真实训' },
  { href: '/office/comment', label: '评语办公' },
  { href: '/office/teaching', label: '教案办公' },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside aria-label="应用导航" className="app-sidebar">
      <div className="app-sidebar__brand">
        <span aria-hidden="true" className="app-sidebar__brand-mark">
          AC
        </span>
        <span className="app-sidebar__brand-text">AetherCore</span>
      </div>
      <nav className="app-sidebar__nav">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={
                active ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'
              }
              href={item.href}
              key={item.href}
              prefetch={false}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
