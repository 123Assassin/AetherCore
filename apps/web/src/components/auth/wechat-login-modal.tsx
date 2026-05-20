'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

type WeChatLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

type ScanState = 'waiting' | 'scanned' | 'confirmed';
type LoginState = 'idle' | 'submitting' | 'error';
type FocusTarget = {
  focus: () => void;
};

export function WeChatLoginModal({ open, onClose }: WeChatLoginModalProps) {
  const client = useTrpcClient();
  const closeButtonRef = useRef<FocusTarget | null>(null);
  const footerButtonRef = useRef<FocusTarget | null>(null);
  const [scanState, setScanState] = useState<ScanState>('waiting');
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const scannedTimer = setTimeout(() => setScanState('scanned'), 1800);
    const confirmedTimer = setTimeout(() => setScanState('confirmed'), 3600);

    return () => {
      clearTimeout(scannedTimer);
      clearTimeout(confirmedTimer);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const statusText =
    scanState === 'waiting'
      ? '请使用微信扫一扫'
      : scanState === 'scanned'
        ? '扫描成功，请在手机端确认'
        : '模拟登录已确认';

  function focusFirstControl() {
    closeButtonRef.current?.focus();
  }

  function focusLastControl() {
    footerButtonRef.current?.focus();
  }

  async function handleMockLogin() {
    if (loginState === 'submitting') {
      return;
    }

    setLoginState('submitting');
    setError(null);

    try {
      await client.auth.mockLogin.mutate();
      onClose();
    } catch (loginError) {
      setLoginState('error');
      setError(getLoginErrorMessage(loginError));
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      aria-labelledby="wechat-login-title"
      aria-modal="true"
      role="dialog"
      style={styles.overlay}
    >
      <section onKeyDown={handleDialogKeyDown} style={styles.dialog}>
        <button
          aria-label="保持焦点在微信登录弹窗内"
          onFocus={focusLastControl}
          style={styles.focusSentinel}
          type="button"
        />
        <div style={styles.header}>
          <div>
            <h2 id="wechat-login-title" style={styles.title}>
              微信扫码登录
            </h2>
            <p style={styles.subtitle}>用于 Playwright 和本地开发的安全模拟登录面板。</p>
          </div>
          <button
            aria-label="关闭微信登录弹窗"
            autoFocus
            onClick={onClose}
            ref={(node) => {
              closeButtonRef.current = node as FocusTarget | null;
            }}
            style={styles.iconButton}
          >
            x
          </button>
        </div>

        <div aria-label="模拟微信扫码区域" style={styles.scanPanel}>
          <div style={styles.qrFrame}>
            <div style={styles.qrGrid}>
              <span style={styles.qrBlockLarge} />
              <span style={styles.qrBlock} />
              <span style={styles.qrBlockWide} />
              <span style={styles.qrBlock} />
              <span style={styles.qrBlockTall} />
              <span style={styles.qrBlockLarge} />
              <span style={styles.qrBlockWide} />
              <span style={styles.qrBlock} />
              <span style={styles.qrBlockLarge} />
            </div>
          </div>
          <strong style={styles.status}>{statusText}</strong>
          <span style={styles.notice}>
            测试环境使用模拟扫码面板，不在前端读取或展示服务端密钥。
          </span>
          {error ? (
            <span aria-live="assertive" role="alert" style={styles.error}>
              {error}
            </span>
          ) : null}
        </div>

        <div style={styles.footer}>
          <button
            onClick={onClose}
            ref={(node) => {
              footerButtonRef.current = node as FocusTarget | null;
            }}
            style={styles.secondaryButton}
          >
            关闭
          </button>
          <button
            disabled={scanState !== 'confirmed' || loginState === 'submitting'}
            onClick={handleMockLogin}
            style={{
              ...styles.primaryButton,
              ...(scanState !== 'confirmed' || loginState === 'submitting'
                ? styles.primaryButtonDisabled
                : {}),
            }}
          >
            {loginState === 'submitting' ? '登录中...' : '完成模拟登录'}
          </button>
        </div>
        <button
          aria-label="保持焦点在微信登录弹窗内"
          onFocus={focusFirstControl}
          style={styles.focusSentinel}
          type="button"
        />
      </section>
    </div>
  );
}

const styles = {
  overlay: {
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.42)',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: 16,
    position: 'fixed',
    zIndex: 50,
  },
  dialog: {
    position: 'relative',
    background: '#ffffff',
    border: '1px solid #d7dde7',
    borderRadius: 8,
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
    color: '#1f2937',
    maxWidth: 380,
    padding: 20,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    lineHeight: '28px',
    margin: 0,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: '20px',
    margin: '4px 0 0',
  },
  iconButton: {
    background: '#f8fafc',
    border: '1px solid #d7dde7',
    borderRadius: 6,
    color: '#334155',
    cursor: 'pointer',
    height: 32,
    width: 32,
  },
  scanPanel: {
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px dashed #b9c3d0',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 18,
    padding: 18,
  },
  qrFrame: {
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #d7dde7',
    display: 'flex',
    height: 148,
    justifyContent: 'center',
    width: 148,
  },
  qrGrid: {
    display: 'grid',
    gap: 6,
    gridTemplateColumns: 'repeat(3, 34px)',
  },
  qrBlock: {
    background: '#1f2937',
    height: 34,
    width: 34,
  },
  qrBlockLarge: {
    background: '#111827',
    height: 34,
    outline: '6px solid #ffffff',
    outlineOffset: -12,
    width: 34,
  },
  qrBlockTall: {
    background: '#475569',
    height: 34,
    width: 34,
  },
  qrBlockWide: {
    background: '#64748b',
    height: 34,
    width: 34,
  },
  status: {
    color: '#166534',
    fontSize: 14,
    lineHeight: '20px',
  },
  notice: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '18px',
    textAlign: 'center',
  },
  error: {
    color: '#b42318',
    fontSize: 12,
    lineHeight: '18px',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  secondaryButton: {
    background: '#ffffff',
    border: '1px solid #b9c3d0',
    borderRadius: 6,
    color: '#334155',
    cursor: 'pointer',
    fontSize: 14,
    padding: '8px 14px',
  },
  primaryButton: {
    background: '#12645c',
    border: '1px solid #12645c',
    borderRadius: 6,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    padding: '8px 14px',
  },
  primaryButtonDisabled: {
    background: '#9ca3af',
    borderColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  focusSentinel: {
    border: 0,
    height: 1,
    opacity: 0,
    padding: 0,
    position: 'absolute',
    width: 1,
  },
} as const;

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '模拟登录失败，请稍后重试。';
}
