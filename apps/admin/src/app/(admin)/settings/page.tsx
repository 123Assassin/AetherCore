import type { CSSProperties } from 'react';

import { PasswordSettingsForm } from '../../../components/settings/password-settings-form';
import { SignOutPanel } from '../../../components/settings/sign-out-panel';

export default function AdminSettingsPage() {
  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Admin / Settings</p>
          <h2 style={styles.heading}>系统设置</h2>
        </div>
      </header>

      <div style={styles.grid}>
        <PasswordSettingsForm />
        <SignOutPanel />
      </div>
    </main>
  );
}

const styles = {
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  grid: {
    alignItems: 'start',
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
    justifyContent: 'space-between',
  },
  heading: {
    color: '#172033',
    fontSize: 24,
    lineHeight: '32px',
    margin: 0,
  },
  main: {
    display: 'grid',
    gap: 16,
  },
} satisfies Record<string, CSSProperties>;
