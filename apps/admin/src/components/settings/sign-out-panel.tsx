'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

export function SignOutPanel() {
  const client = useTrpcClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleSignOut() {
    let redirected = false;

    setLoading(true);
    setError(null);

    try {
      await client.adminAuth.logout.mutate();
      redirected = true;
      router.replace('/login');
    } catch {
      if (mountedRef.current) {
        setError('退出登录失败，请稍后重试。');
      }
    } finally {
      if (!redirected && mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <section
      aria-labelledby="sign-out-panel-title"
      className="flex items-center justify-between gap-6 rounded-[48px] border border-red-100/50 bg-red-50/50 p-10 transition-all hover:bg-red-50"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-black tracking-tight text-red-800" id="sign-out-panel-title">
          退出系统
        </h2>
        <p className="text-sm font-medium text-red-600/60">撤销当前的本地身份验证令牌</p>
        {error ? (
          <p aria-live="polite" className="text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button
        className="flex shrink-0 items-center gap-3 rounded-[20px] border border-red-200 bg-white px-8 py-4 font-extrabold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white hover:shadow-xl hover:shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={handleSignOut}
        type="button"
      >
        <LogOut aria-hidden="true" size={20} />
        {loading ? '退出中...' : '退出登录'}
      </button>
    </section>
  );
}
