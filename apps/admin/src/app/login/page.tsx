'use client';

import { Lock, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

const defaultAdminUsername = 'admin';
const errorId = 'admin-login-error';

export default function LoginPage() {
  const client = useTrpcClient();
  const router = useRouter();
  const [username, setUsername] = useState(defaultAdminUsername);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setError('密码错误，请重试');
      return;
    }

    const submittedUsername = username.trim() || defaultAdminUsername;

    setSubmitting(true);
    setError('');

    try {
      const result = await client.adminAuth.login.mutate({
        password,
        username: submittedUsername,
      });

      if (!result.success) {
        setError('密码错误，请重试');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('登录服务暂不可用，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-sidebar-dark relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="bg-primary/20 absolute top-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />

      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[40px] border border-slate-800 bg-slate-900 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
      >
        <div className="p-10 pb-6 text-center">
          <div className="bg-primary/10 text-primary ring-primary/5 mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl ring-8">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Nexus 管理后台</h1>
          <p className="mt-2 font-medium text-slate-400">需要进行身份验证</p>
        </div>

        <form aria-label="管理员登录" className="space-y-8 p-10 pt-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                className="ml-2 text-[10px] font-black tracking-widest text-slate-500 uppercase"
                htmlFor="admin-username"
              >
                授权账号
              </label>
              <div className="relative">
                <User
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  autoComplete="username"
                  className="focus:ring-primary/20 focus:border-primary w-full rounded-2xl border border-slate-700/50 bg-slate-800/50 py-4 pr-4 pl-12 text-white transition-all outline-none placeholder:text-slate-600 focus:ring-4"
                  id="admin-username"
                  onChange={(event) => setUsername(readInputValue(event.currentTarget))}
                  placeholder={defaultAdminUsername}
                  type="text"
                  value={username}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="ml-2 text-[10px] font-black tracking-widest text-slate-500 uppercase"
                htmlFor="admin-password"
              >
                访问凭据
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={Boolean(error)}
                  autoComplete="current-password"
                  autoFocus
                  className="focus:ring-primary/20 focus:border-primary w-full rounded-2xl border border-slate-700 bg-slate-800 py-4 pr-4 pl-12 text-white transition-all outline-none placeholder:text-slate-600 focus:ring-4"
                  id="admin-password"
                  onChange={(event) => setPassword(readInputValue(event.currentTarget))}
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                />
              </div>
              {error ? (
                <p
                  aria-live="polite"
                  className="mt-2 ml-2 flex items-center gap-1 text-xs font-bold text-red-400"
                  id={errorId}
                  role="alert"
                >
                  <span className="h-1 w-1 rounded-full bg-red-400" />
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <button
            className="bg-primary hover:bg-primary-dark shadow-primary/40 w-full rounded-2xl py-5 font-black text-white shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '登录中...' : '登录系统'}
          </button>
        </form>

        <div className="border-t border-slate-800/50 bg-slate-800/30 px-10 py-8 text-center">
          <p className="text-xs font-medium tracking-tight text-slate-500">
            系统版本 v4.12.0 // AES-256 加密保护
          </p>
        </div>
      </motion.div>
    </main>
  );
}

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
