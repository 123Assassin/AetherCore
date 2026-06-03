'use client';

import { Loader2, QrCode, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';
import { trapModalFocus } from '../modal/focus-trap';

type WeChatLoginModalProps = {
  onClose: () => void;
  open: boolean;
};

type WeChatLoginStatus = 'loading' | 'ready' | 'error';

type WxLoginOptions = {
  appid: string;
  href?: string;
  id: string;
  redirect_uri: string;
  scope: 'snsapi_login';
  self_redirect?: boolean;
  state: string;
  style?: 'black' | 'white';
};

type WxLoginConstructor = new (options: WxLoginOptions) => unknown;

type ScriptElementLike = {
  addEventListener: (
    type: 'error' | 'load',
    listener: () => void,
    options?: { once?: boolean }
  ) => void;
  async: boolean;
  id: string;
  src: string;
};

type DocumentLike = {
  createElement: (tagName: 'script') => ScriptElementLike;
  getElementById: (id: string) => { innerHTML: string } | ScriptElementLike | null;
  head: {
    appendChild: (element: ScriptElementLike) => unknown;
  };
};

type BrowserGlobal = typeof globalThis & {
  document?: DocumentLike;
  WxLogin?: WxLoginConstructor;
};

const wxLoginScriptId = 'wechat-login-sdk';
const wxLoginScriptSrc = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
const qrCodeContainerId = 'wechat-login-qrcode';

export function WeChatLoginModal({ onClose, open }: WeChatLoginModalProps) {
  const client = useTrpcClient();
  const activeRequestRef = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<WeChatLoginStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    async function renderWeChatQrCode() {
      await Promise.resolve();

      if (requestId !== activeRequestRef.current) {
        return;
      }

      setStatus('loading');
      setError(null);

      try {
        const [config] = await Promise.all([
          client.auth.wechatLoginConfig.query(),
          loadWxLoginScript(),
        ]);

        if (requestId !== activeRequestRef.current) {
          return;
        }

        const browser = getBrowserGlobal();
        const container = browser.document?.getElementById(qrCodeContainerId) as
          | { innerHTML: string }
          | null
          | undefined;
        const WxLogin = browser.WxLogin;

        if (!container || !WxLogin) {
          throw new Error('WeChat login SDK is unavailable');
        }

        container.innerHTML = '';
        new WxLogin({
          appid: config.appId,
          id: qrCodeContainerId,
          redirect_uri: encodeURIComponent(config.redirectUri),
          scope: config.scope,
          state: config.state,
          style: 'black',
        });
        setStatus('ready');
      } catch (loginError) {
        if (requestId !== activeRequestRef.current) {
          return;
        }

        setStatus('error');
        setError(getLoginErrorMessage(loginError));
      }
    }

    void renderWeChatQrCode();

    return () => {
      activeRequestRef.current += 1;
    };
  }, [client, open]);

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

          <div className="relative mb-6 flex min-h-80 w-full items-center justify-center rounded-xl border border-gray-200 bg-white">
            <div className="wechat-login-qrcode min-h-80 w-full" id={qrCodeContainerId} />

            {status === 'loading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-green-500" />
                <span className="text-sm font-medium text-gray-500">正在加载微信二维码</span>
              </div>
            ) : null}

            {status === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white px-6 text-gray-500">
                <QrCode className="mb-3 h-12 w-12 text-gray-300" />
                <span className="text-sm font-semibold text-red-500">二维码加载失败</span>
              </div>
            ) : null}
          </div>

          {error ? (
            <p aria-live="assertive" className="mb-3 text-xs font-medium text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <p className="mb-5 text-xs text-gray-400">
            {status === 'error' ? '请稍后重试' : '请打开微信，点击右上角"+"扫一扫'}
          </p>
        </div>
      </section>
    </div>
  );
}

function loadWxLoginScript(): Promise<void> {
  const browser = getBrowserGlobal();
  const document = browser.document;

  if (browser.WxLogin) {
    return Promise.resolve();
  }

  if (!document) {
    return Promise.reject(new Error('WeChat login SDK requires a browser environment'));
  }

  const existingScript = document.getElementById(wxLoginScriptId) as ScriptElementLike | null;

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('WeChat login SDK failed')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.id = wxLoginScriptId;
    script.src = wxLoginScriptSrc;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('WeChat login SDK failed')), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

function getBrowserGlobal(): BrowserGlobal {
  return globalThis as BrowserGlobal;
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '微信二维码加载失败，请稍后重试。';
}
