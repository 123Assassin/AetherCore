'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { useTrpcClient } from '../../trpc/provider';

type AuthError = {
  kind: 'auth' | 'network';
  message: string;
};

export default function LoginPage() {
  const client = useTrpcClient();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorId = 'admin-login-error';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError({ kind: 'auth', message: '请输入管理员账号和密码。' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await client.adminAuth.login.mutate({
        password,
        username: username.trim(),
      });

      if (!result.success) {
        setError({ kind: 'auth', message: result.error.message });
        return;
      }

      router.push('/dashboard');
    } catch {
      setError({ kind: 'network', message: '登录服务暂不可用，请稍后重试。' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.main}>
      <form aria-label="管理员登录" onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>AetherCore Admin</h1>
        <label style={styles.field}>
          <span style={styles.labelText}>管理员账号</span>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error?.kind === 'auth'}
            autoComplete="username"
            onChange={(event) => setUsername(readInputValue(event.target))}
            style={styles.input}
            type="text"
            value={username}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.labelText}>密码</span>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error?.kind === 'auth'}
            autoComplete="current-password"
            onChange={(event) => setPassword(readInputValue(event.target))}
            style={styles.input}
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p aria-live="polite" id={errorId} role="alert" style={styles.error}>
            {error.kind === 'auth' ? '认证失败：' : '请求失败：'}
            {error.message}
          </p>
        ) : null}

        <button disabled={submitting} style={styles.button} type="submit">
          {submitting ? '登录中...' : '登录'}
        </button>
      </form>
    </main>
  );
}

const styles = {
  main: {
    alignItems: 'center',
    color: '#1f2937',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  form: {
    border: '1px solid #d7dde7',
    borderRadius: 8,
    display: 'grid',
    gap: 14,
    maxWidth: 360,
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 22,
    lineHeight: '30px',
    margin: 0,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  labelText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: '18px',
  },
  input: {
    border: '1px solid #b9c3d0',
    borderRadius: 6,
    fontSize: 14,
    padding: '9px 10px',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '8px 10px',
  },
  button: {
    background: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: 6,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    padding: '10px 14px',
  },
} as const;

function readInputValue(target: EventTarget): string {
  const value = (target as { value?: unknown }).value;

  return typeof value === 'string' ? value : '';
}
