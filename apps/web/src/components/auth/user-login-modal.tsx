'use client';

import type { AuthUserSummary } from '@package/shared';
import { Loader2, Lock, LogIn, User, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';
import { trapModalFocus } from '../modal/focus-trap';

type UserLoginModalProps = {
  message?: string | null;
  onClose: () => void;
  onLoginSuccess: (user: AuthUserSummary) => void;
  open: boolean;
};

export function UserLoginModal({ message, onClose, onLoginSuccess, open }: UserLoginModalProps) {
  const client = useTrpcClient();
  const dialogRef = useRef<HTMLElement | null>(null);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    trapModalFocus(event, dialogRef, onClose);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const username = user.trim();

    if (!username || !password) {
      setError('请输入用户名和密码。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await client.auth.userLogin.mutate({ password, user: username });

      if (!result.success) {
        setError('用户名或密码不正确。');
        return;
      }

      onLoginSuccess(result.data.user);
      onClose();
    } catch {
      setError('登录服务暂时不可用，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      aria-labelledby="user-login-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <section
        className="animate-in fade-in zoom-in relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl duration-200"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
      >
        <button
          aria-label="关闭登录弹窗"
          autoFocus
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-gray-600"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <form className="flex flex-col p-8" onSubmit={handleSubmit}>
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <LogIn className="h-7 w-7" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800" id="user-login-title">
              登录账户
            </h2>
            <p className="text-sm text-gray-500">使用平台账号继续</p>
          </div>

          {message ? (
            <p
              aria-live="polite"
              className="mb-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
            >
              {message}
            </p>
          ) : null}

          <label className="mb-4 block text-left">
            <span className="mb-2 block text-sm font-semibold text-gray-700">用户名</span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 transition-colors focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100">
              <User className="h-5 w-5 text-gray-400" />
              <input
                autoComplete="username"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                onChange={(event) => setUser(readInputValue(event.currentTarget))}
                placeholder="请输入用户名"
                value={user}
              />
            </span>
          </label>

          <label className="mb-5 block text-left">
            <span className="mb-2 block text-sm font-semibold text-gray-700">密码</span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 transition-colors focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100">
              <Lock className="h-5 w-5 text-gray-400" />
              <input
                autoComplete="current-password"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                onChange={(event) => setPassword(readInputValue(event.currentTarget))}
                placeholder="请输入密码"
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? (
            <p aria-live="assertive" className="mb-4 text-sm font-medium text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            disabled={submitting}
            type="submit"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>{submitting ? '登录中' : '登录'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
