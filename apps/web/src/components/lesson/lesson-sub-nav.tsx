'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const lessonNavItems = [
  { href: '/lesson/inspiration', label: '灵感课程' },
  { href: '/lesson/simulation', label: '仿真实训' },
] as const;

function isActiveLessonRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LessonSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="课程导航" className="lesson-sub-nav">
      {lessonNavItems.map((item) => {
        const active = isActiveLessonRoute(pathname, item.href);

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={
              active ? 'lesson-sub-nav__link lesson-sub-nav__link--active' : 'lesson-sub-nav__link'
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
