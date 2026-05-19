'use client';

import { useRef, useState } from 'react';

import { WeChatLoginModal } from '../components/auth/wechat-login-modal';
import { DonateModal } from '../components/sponsor/donate-modal';

type FocusTarget = {
  focus: () => void;
};

export default function Page() {
  const wechatButtonRef = useRef<FocusTarget | null>(null);
  const donateButtonRef = useRef<FocusTarget | null>(null);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  function closeWechatModal() {
    setWechatOpen(false);
    setTimeout(() => wechatButtonRef.current?.focus(), 0);
  }

  function closeDonateModal() {
    setDonateOpen(false);
    setTimeout(() => donateButtonRef.current?.focus(), 0);
  }

  return (
    <main style={styles.main}>
      <section style={styles.panel}>
        <h1 style={styles.title}>AetherCore Web</h1>
        <div style={styles.actions}>
          <button
            aria-label="打开微信登录弹窗"
            onClick={() => setWechatOpen(true)}
            ref={(node) => {
              wechatButtonRef.current = node as FocusTarget | null;
            }}
            style={styles.button}
          >
            微信登录
          </button>
          <button
            aria-label="打开赞助弹窗"
            onClick={() => setDonateOpen(true)}
            ref={(node) => {
              donateButtonRef.current = node as FocusTarget | null;
            }}
            style={styles.button}
          >
            赞助合作
          </button>
        </div>
      </section>

      {wechatOpen ? <WeChatLoginModal onClose={closeWechatModal} open /> : null}
      {donateOpen ? <DonateModal onClose={closeDonateModal} open /> : null}
    </main>
  );
}

const styles = {
  main: {
    color: '#1f2937',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
  },
  panel: {
    border: '1px solid #d7dde7',
    borderRadius: 8,
    maxWidth: 520,
    padding: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: '30px',
    margin: '0 0 16px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    background: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: 6,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    padding: '9px 14px',
  },
} as const;
