'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useTrpcClient } from '../../../../trpc/provider';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function WeChatCallbackPage() {
  return (
    <Suspense fallback={<WeChatCallbackStatusCard message="正在完成微信登录" status="loading" />}>
      <WeChatCallbackContent />
    </Suspense>
  );
}

function WeChatCallbackContent() {
  const client = useTrpcClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('正在完成微信登录');

  useEffect(() => {
    let cancelled = false;
    const code = searchParams.get('code')?.trim();
    const state = searchParams.get('state')?.trim();

    async function completeLogin() {
      if (!code || !state) {
        setStatus('error');
        setMessage('微信登录回调缺少 code 或 state。');
        return;
      }

      try {
        await client.auth.wechatCallback.mutate({ code, state });

        if (cancelled) {
          return;
        }

        setStatus('success');
        setMessage('登录成功，正在进入系统。');
        setTimeout(() => {
          if (!cancelled) {
            router.replace('/');
          }
        }, 600);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setMessage(getCallbackErrorMessage(error));
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [client, router, searchParams]);

  return <WeChatCallbackStatusCard message={message} status={status} />;
}

function WeChatCallbackStatusCard({
  message,
  status,
}: {
  message: string;
  status: CallbackStatus;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status === 'loading' ? (
          <Loader2 className="mx-auto mb-5 h-12 w-12 animate-spin text-green-500" />
        ) : null}
        {status === 'success' ? (
          <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-green-500" />
        ) : null}
        {status === 'error' ? <XCircle className="mx-auto mb-5 h-12 w-12 text-red-500" /> : null}
        <h1 className="mb-2 text-xl font-bold text-slate-900">微信扫码登录</h1>
        <p className="text-sm text-slate-500">{message}</p>
      </section>
    </main>
  );
}

function getCallbackErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message === 'Invalid WeChat login state') {
      return '微信登录状态已失效，请返回重新扫码。';
    }

    if (error.message === 'WeChat authorization failed') {
      return '微信授权失败，请返回重新扫码。';
    }

    return error.message;
  }

  return '微信登录失败，请返回后重新扫码。';
}
