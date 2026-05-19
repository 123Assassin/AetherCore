'use client';

import { type KeyboardEvent, useRef } from 'react';

type DonateModalProps = {
  confirmLabel?: string;
  onConfirm?: () => void;
  open: boolean;
  onClose: () => void;
};

type FocusTarget = {
  focus: () => void;
};

export function DonateModal({
  confirmLabel = '我知道了',
  onConfirm,
  open,
  onClose,
}: DonateModalProps) {
  const closeButtonRef = useRef<FocusTarget | null>(null);
  const confirmButtonRef = useRef<FocusTarget | null>(null);

  if (!open) {
    return null;
  }

  function focusFirstControl() {
    closeButtonRef.current?.focus();
  }

  function focusLastControl() {
    confirmButtonRef.current?.focus();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      aria-labelledby="donate-modal-title"
      aria-modal="true"
      role="dialog"
      style={styles.overlay}
    >
      <section onKeyDown={handleDialogKeyDown} style={styles.dialog}>
        <button
          aria-label="保持焦点在赞助弹窗内"
          onFocus={focusLastControl}
          style={styles.focusSentinel}
          type="button"
        />
        <div style={styles.header}>
          <div>
            <h2 id="donate-modal-title" style={styles.title}>
              赞助与合作
            </h2>
            <p style={styles.subtitle}>服务器与 AI Token 成本持续增长，欢迎赞助或商业合作。</p>
          </div>
          <button
            aria-label="关闭赞助弹窗"
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

        <div style={styles.content}>
          <p style={styles.paragraph}>
            如果您觉得红笔AI有价值，欢迎通过赞助、推广或技术合作帮助项目持续运行。
          </p>
          <p style={styles.paragraph}>来信请附上联系方式、合作事由与意向报价，我们会尽快回复。</p>
          <div style={styles.contactBox}>
            <span style={styles.contactLabel}>合作联系</span>
            <a href="mailto:3697543027@qq.com" style={styles.email}>
              3697543027@qq.com
            </a>
          </div>
        </div>

        <button
          onClick={onConfirm ?? onClose}
          ref={(node) => {
            confirmButtonRef.current = node as FocusTarget | null;
          }}
          style={styles.primaryButton}
        >
          {confirmLabel}
        </button>
        <button
          aria-label="保持焦点在赞助弹窗内"
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
    maxWidth: 420,
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
  content: {
    display: 'grid',
    gap: 12,
    marginTop: 18,
  },
  paragraph: {
    color: '#334155',
    fontSize: 14,
    lineHeight: '22px',
    margin: 0,
  },
  contactBox: {
    background: '#f8fafc',
    border: '1px solid #d7dde7',
    borderRadius: 8,
    display: 'grid',
    gap: 4,
    padding: 12,
  },
  contactLabel: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: '18px',
  },
  email: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: 700,
  },
  primaryButton: {
    background: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: 6,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    marginTop: 18,
    padding: '10px 14px',
    width: '100%',
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
