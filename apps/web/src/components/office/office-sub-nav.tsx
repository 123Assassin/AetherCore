'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const officeNavItems = [
  { href: '/office/comment', label: '评语办公' },
  { href: '/office/teaching', label: '教案办公' },
] as const;

function isActiveOfficeRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OfficeSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="办公导航" className="office-sub-nav">
      {officeNavItems.map((item) => {
        const active = isActiveOfficeRoute(pathname, item.href);

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={
              active ? 'office-sub-nav__link office-sub-nav__link--active' : 'office-sub-nav__link'
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
  );
}
