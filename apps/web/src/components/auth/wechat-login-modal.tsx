'use client';

import type { AuthUserSummary } from '@package/shared';
import { CheckCircle2, QrCode, X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';
import { trapModalFocus } from '../modal/focus-trap';

type WeChatLoginModalProps = {
  onClose: () => void;
  onLoginSuccess?: (user: AuthUserSummary) => void;
  open: boolean;
};

type ScanState = 'waiting' | 'scanned' | 'confirmed';

export function WeChatLoginModal({ onClose, onLoginSuccess, open }: WeChatLoginModalProps) {
  const client = useTrpcClient();
  const activeRequestRef = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const loginStartedRef = useRef(false);
  const [scanState, setScanState] = useState<ScanState>('waiting');
  const [error, setError] = useState<string | null>(null);

  const completeMockLogin = useCallback(async () => {
    if (loginStartedRef.current) {
      return;
    }

    loginStartedRef.current = true;
    const requestId = activeRequestRef.current;
    setError(null);

    try {
      const result = await client.auth.mockLogin.mutate();

      if (requestId !== activeRequestRef.current) {
        return;
      }

      if (result.success) {
        onLoginSuccess?.(result.data.user);
      }

      onClose();
    } catch (loginError) {
      if (requestId !== activeRequestRef.current) {
        return;
      }

      loginStartedRef.current = false;
      setError(getLoginErrorMessage(loginError));
    }
  }, [client, onClose, onLoginSuccess]);

  useEffect(() => {
    if (!open) {
      return;
    }

    activeRequestRef.current += 1;
    loginStartedRef.current = false;
    const scannedTimer = setTimeout(() => setScanState('scanned'), 1800);
    const confirmedTimer = setTimeout(() => setScanState('confirmed'), 3600);
    const loginTimer = setTimeout(() => {
      void completeMockLogin();
    }, 4600);

    return () => {
      clearTimeout(scannedTimer);
      clearTimeout(confirmedTimer);
      clearTimeout(loginTimer);
      activeRequestRef.current += 1;
    };
  }, [completeMockLogin, open]);

  if (!open) {
    return null;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    trapModalFocus(event, dialogRef, onClose);
  }

  return (
    <div
      aria-labelledby="wechat-login-title"
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
          aria-label="关闭微信登录弹窗"
          autoFocus
          className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-gray-600"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800" id="wechat-login-title">
            微信扫码登录
          </h2>
          <p className="mb-8 text-sm text-gray-500">使用微信扫一扫，安全快捷登录</p>

          <div className="relative mb-6 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
            {scanState === 'waiting' ? <QrCode className="h-32 w-32 text-gray-400" /> : null}
            {scanState === 'scanned' ? (
              <div className="animate-in fade-in flex flex-col items-center text-green-500">
                <CheckCircle2 className="mb-2 h-16 w-16" />
                <span className="font-medium">扫描成功</span>
                <span className="mt-1 text-xs text-gray-400">请在手机端确认登录</span>
              </div>
            ) : null}
            {scanState === 'confirmed' ? (
              <div className="animate-in fade-in zoom-in flex flex-col items-center text-green-500">
                <CheckCircle2 className="mb-2 h-16 w-16" />
                <span className="font-medium">登录成功！</span>
              </div>
            ) : null}

            {scanState === 'waiting' ? (
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div className="h-0.5 w-full animate-[scan_2s_ease-in-out_infinite] bg-green-400/50 shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]" />
              </div>
            ) : null}
          </div>

          {error ? (
            <p aria-live="assertive" className="mb-3 text-xs font-medium text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <p className="mb-5 text-xs text-gray-400">
            {error
              ? '模拟登录失败，请稍后重试'
              : scanState === 'waiting'
                ? '请打开微信，点击右上角"+"扫一扫'
                : '即将进入系统...'}
          </p>
        </div>
      </section>
      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(192px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '模拟登录失败，请稍后重试。';
}
