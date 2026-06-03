import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminShell } from '../../components/layout/admin-shell';

const adminSessionCookieName = process.env.ADMIN_SESSION_COOKIE_NAME || 'aether_admin_session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

  if (!cookieStore.has(adminSessionCookieName)) {
    redirect('/login');
  }

  return <AdminShell>{children}</AdminShell>;
}
