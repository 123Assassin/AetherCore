'use client';

import {
  type AdminAgentCreateInput,
  type AdminAgentItem,
  type AdminModelEngineItem,
  type AdminPromptItem,
  type AdminSensitiveWordListItem,
} from '@package/shared';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

type AgentFormDialogProps = {
  agent: AdminAgentItem | null;
  engines: AdminModelEngineItem[];
  onClose: () => void;
  onSubmit: (input: AdminAgentCreateInput) => Promise<void>;
  open: boolean;
  prompts: AdminPromptItem[];
  sensitiveWordLists: AdminSensitiveWordListItem[];
  submitting?: boolean;
};

type AgentFormState = {
  engineId: string;
  key: AdminAgentCreateInput['key'];
  maxTokens: string;
  name: string;
  promptId: string;
  sensitiveListId: string;
  status: NonNullable<AdminAgentCreateInput['status']>;
  temperature: string;
  topP: string;
};

type FocusableElement = {
  focus: () => void;
  offsetParent: unknown | null;
};

type FocusableDialogElement = FocusableElement & {
  querySelectorAll: (selector: string) => ArrayLike<FocusableElement>;
};

type BrowserFocusGlobal = typeof globalThis & {
  document?: {
    activeElement?: unknown;
  };
};

const defaultFormState: AgentFormState = {
  engineId: '',
  key: 'chat',
  maxTokens: '2048',
  name: '',
  promptId: '',
  sensitiveListId: '',
  status: 'enabled',
  temperature: '0.7',
  topP: '0.9',
};

const agentKeyOptions = [
  'chat',
  'inspiration',
  'comment',
  'teaching',
] as const satisfies readonly AdminAgentCreateInput['key'][];
const statusOptions = ['enabled', 'disabled'] as const satisfies readonly NonNullable<
  AdminAgentCreateInput['status']
>[];
const agentDialogTitleId = 'agent-form-dialog-title';

export function AgentFormDialog({
  agent,
  engines,
  onClose,
  onSubmit,
  open,
  prompts,
  sensitiveWordLists,
  submitting = false,
}: AgentFormDialogProps) {
  const [form, setForm] = useState<AgentFormState>(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<FocusableDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
      setForm(agent ? toFormState(agent) : defaultFormState);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [agent, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    focusFirstDialogControl(dialogRef.current);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setError('请输入智能体名称。');
      return;
    }

    if (!form.engineId) {
      setError('请选择模型引擎。');
      return;
    }

    const temperature = parseRequiredNumber(form.temperature, 'Temperature', 0, 2);

    if (!temperature.valid) {
      setError(temperature.message);
      return;
    }

    const topP = parseRequiredNumber(form.topP, 'TopP', 0, 1);

    if (!topP.valid) {
      setError(topP.message);
      return;
    }

    const maxTokens = parseRequiredPositiveInteger(form.maxTokens, 'Max Tokens');

    if (!maxTokens.valid) {
      setError(maxTokens.message);
      return;
    }

    setError(null);
    await onSubmit({
      engineId: form.engineId,
      key: form.key,
      maxTokens: maxTokens.value,
      name,
      promptId: form.promptId || null,
      sensitiveListId: form.sensitiveListId || null,
      status: form.status,
      temperature: temperature.value,
      topP: topP.value,
    });
  }

  return (
    <div role="presentation" style={styles.backdrop}>
      <section
        aria-labelledby={agentDialogTitleId}
        aria-modal="true"
        onKeyDown={(event) => handleDialogKeyDown(event, onClose)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        style={styles.dialog}
        tabIndex={-1}
      >
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Resources / Agents</p>
            <h2 id={agentDialogTitleId} style={styles.title}>
              {agent ? '编辑智能体' : '新建智能体'}
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton} type="button">
            关闭
          </button>
        </div>

        {error ? (
          <p aria-live="polite" role="alert" style={styles.error}>
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>智能体 Key</span>
            <select
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({
                  ...current,
                  key: value as AgentFormState['key'],
                }));
              }}
              style={styles.input}
              value={form.key}
            >
              {agentKeyOptions.map((key) => (
                <option key={key} value={key}>
                  {agentKeyLabels[key]} / {key}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>名称</span>
            <input
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, name: value }));
              }}
              placeholder="例如：对话助手"
              style={styles.input}
              value={form.name}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>模型引擎</span>
            <select
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, engineId: value }));
              }}
              style={styles.input}
              value={form.engineId}
            >
              <option value="">请选择模型引擎</option>
              {engines.map((engine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name} / {engine.provider}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>绑定 Prompt</span>
            <select
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({ ...current, promptId: value }));
              }}
              style={styles.input}
              value={form.promptId}
            >
              <option value="">不绑定</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title} / {prompt.version}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>敏感词库</span>
            <select
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({
                  ...current,
                  sensitiveListId: value,
                }));
              }}
              style={styles.input}
              value={form.sensitiveListId}
            >
              <option value="">不绑定</option>
              {sensitiveWordLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.inlineFields}>
            <label style={styles.field}>
              <span style={styles.label}>Temperature</span>
              <input
                inputMode="decimal"
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({
                    ...current,
                    temperature: value,
                  }));
                }}
                style={styles.input}
                value={form.temperature}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>TopP</span>
              <input
                inputMode="decimal"
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({ ...current, topP: value }));
                }}
                style={styles.input}
                value={form.topP}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Max Tokens</span>
              <input
                inputMode="numeric"
                onChange={(event) => {
                  const value = readFormValue(event.currentTarget);

                  setForm((current) => ({
                    ...current,
                    maxTokens: value,
                  }));
                }}
                style={styles.input}
                value={form.maxTokens}
              />
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>状态</span>
            <select
              onChange={(event) => {
                const value = readFormValue(event.currentTarget);

                setForm((current) => ({
                  ...current,
                  status: value as AgentFormState['status'],
                }));
              }}
              style={styles.input}
              value={form.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'enabled' ? '启用' : '停用'}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.actions}>
            <button onClick={onClose} style={styles.secondaryButton} type="button">
              取消
            </button>
            <button disabled={submitting} style={styles.primaryButton} type="submit">
              {submitting ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toFormState(agent: AdminAgentItem): AgentFormState {
  return {
    engineId: agent.engineId,
    key: agent.key,
    maxTokens: String(agent.maxTokens),
    name: agent.name,
    promptId: agent.promptId ?? '',
    sensitiveListId: agent.sensitiveListId ?? '',
    status: agent.status,
    temperature: String(agent.temperature),
    topP: String(agent.topP),
  };
}

type ParsedNumber =
  | {
      valid: true;
      value: number;
    }
  | {
      message: string;
      valid: false;
    };

function parseRequiredNumber(value: string, label: string, min: number, max: number): ParsedNumber {
  const trimmedValue = value.trim();
  const parsed = Number(trimmedValue);

  if (!trimmedValue || !Number.isFinite(parsed)) {
    return {
      message: `请输入有效的 ${label}。`,
      valid: false,
    };
  }

  if (parsed < min || parsed > max) {
    return {
      message: `${label} 必须介于 ${min} 和 ${max} 之间。`,
      valid: false,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

function parseRequiredPositiveInteger(value: string, label: string): ParsedNumber {
  const trimmedValue = value.trim();

  if (!/^[1-9]\d*$/.test(trimmedValue)) {
    return {
      message: `${label} 必须为正整数。`,
      valid: false,
    };
  }

  return {
    valid: true,
    value: Number(trimmedValue),
  };
}

function handleDialogKeyDown(event: KeyboardEvent, onClose: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const dialogElement = event.currentTarget as unknown as FocusableDialogElement;
  const focusableElements = getFocusableElements(dialogElement);

  if (focusableElements.length === 0) {
    event.preventDefault();
    dialogElement.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = (globalThis as BrowserFocusGlobal).document?.activeElement;

  if (event.shiftKey && (activeElement === firstElement || activeElement === dialogElement)) {
    event.preventDefault();
    lastElement?.focus();
    return;
  }

  if (!event.shiftKey && (activeElement === lastElement || activeElement === dialogElement)) {
    event.preventDefault();
    firstElement?.focus();
  }
}

function focusFirstDialogControl(container: FocusableDialogElement | null) {
  if (!container) {
    return;
  }

  getFocusableElements(container)[0]?.focus();
}

function getFocusableElements(container: FocusableDialogElement): FocusableElement[] {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null);
}

function readFormValue(target: EventTarget): string {
  return (target as EventTarget & { value: string }).value;
}

const agentKeyLabels: Record<AdminAgentCreateInput['key'], string> = {
  chat: '对话智能体',
  comment: '点评智能体',
  inspiration: '灵感智能体',
  teaching: '教学智能体',
};

const buttonBase = {
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: '18px',
  padding: '8px 12px',
} satisfies CSSProperties;

const styles = {
  actions: {
    borderTop: '1px solid #e5eaf1',
    display: 'flex',
    gap: 10,
    justifyContent: 'end',
    paddingTop: 14,
  },
  backdrop: {
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.42)',
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  closeButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  dialog: {
    background: '#ffffff',
    border: '1px solid #d8dee8',
    borderRadius: 8,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.24)',
    display: 'grid',
    gap: 14,
    maxHeight: 'calc(100vh - 40px)',
    maxWidth: 760,
    overflow: 'auto',
    padding: 18,
    width: 'min(100%, 760px)',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
    padding: '9px 11px',
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: '16px',
    margin: '0 0 4px',
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  form: {
    display: 'grid',
    gap: 14,
  },
  header: {
    alignItems: 'start',
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
  },
  inlineFields: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  },
  input: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    color: '#172033',
    fontSize: 14,
    lineHeight: '20px',
    minHeight: 38,
    padding: '8px 10px',
    width: '100%',
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: '18px',
  },
  primaryButton: {
    ...buttonBase,
    background: '#0f766e',
    border: '1px solid #0f766e',
    color: '#ffffff',
  },
  secondaryButton: {
    ...buttonBase,
    background: '#ffffff',
    border: '1px solid #c8d1dc',
    color: '#334155',
  },
  title: {
    color: '#172033',
    fontSize: 18,
    lineHeight: '24px',
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;
