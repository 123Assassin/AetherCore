'use client';

import {
  type AdminAgentCreateInput,
  type AdminAgentItem,
  type AdminModelEngineItem,
  type AdminPromptItem,
  type AdminSensitiveWordListItem,
  agentSubjectOptions,
  getAdminAgentClassificationMode,
  getAdminAgentGradeOptions,
  WEB_AGENT_MAPPING,
  webAgentKeys,
} from '@package/shared';
import { Settings2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

type AgentFormDialogProps = {
  agent: AdminAgentItem | null;
  engines: AdminModelEngineItem[];
  onClose: () => void;
  onSubmit: (input: AgentFormSubmitInput) => Promise<void>;
  open: boolean;
  prompts: AdminPromptItem[];
  sensitiveWordLists: AdminSensitiveWordListItem[];
  submitting?: boolean;
};

export type AgentFormSubmitInput = Omit<AdminAgentCreateInput, 'key'> & {
  key?: AdminAgentCreateInput['key'];
};

type AgentFormState = {
  engineId: string;
  grade: string;
  key: AdminAgentCreateInput['key'];
  maxTokens: string;
  name: string;
  promptId: string;
  sensitiveListId: string;
  status: NonNullable<AdminAgentCreateInput['status']>;
  subject: string;
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
  grade: '',
  key: 'chat',
  maxTokens: '2048',
  name: '',
  promptId: '',
  sensitiveListId: '',
  status: 'enabled',
  subject: '',
  temperature: '0.7',
  topP: '0.9',
};

const agentKeyOptions = webAgentKeys satisfies AdminAgentCreateInput['key'][];
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

  const classificationMode = getAdminAgentClassificationMode(form.key);
  const gradeOptions = getAdminAgentGradeOptions(form.key);

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

    if (classificationMode !== 'none' && !form.grade) {
      setError('请选择年级分类。');
      return;
    }

    if (classificationMode === 'gradeSubject' && !form.subject) {
      setError('请选择学科分类。');
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

    const submitInput = {
      engineId: form.engineId,
      grade: classificationMode === 'none' ? null : form.grade,
      maxTokens: maxTokens.value,
      name,
      promptId: form.promptId || null,
      sensitiveListId: form.sensitiveListId || null,
      status: form.status,
      subject: classificationMode === 'gradeSubject' ? form.subject : null,
      temperature: temperature.value,
      topP: topP.value,
    } satisfies Omit<AgentFormSubmitInput, 'key'>;

    setError(null);
    await onSubmit(agent ? submitInput : { ...submitInput, key: form.key });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <motion.div
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-labelledby={agentDialogTitleId}
        aria-modal="true"
        className="custom-scrollbar relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        onKeyDown={(event) => handleDialogKeyDown(event, onClose, submitting)}
        ref={(element) => {
          dialogRef.current = element as FocusableDialogElement | null;
        }}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800" id={agentDialogTitleId}>
              {agent ? '编辑智能体' : '配置新智能体'}
            </h3>
            <p className="text-sm text-slate-500">
              {agent ? '修改当前运行的智能体配置' : '设置智能体参数及部署环境'}
            </p>
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-scrollbar max-h-[64vh] space-y-6 overflow-y-auto p-8">
            {error ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="ml-1 block text-sm font-bold text-slate-700">智能体名称</span>
                <input
                  className="focus:border-primary focus:ring-primary/10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                  onChange={(event) => {
                    const value = readFormValue(event.currentTarget);

                    setForm((current) => ({ ...current, name: value }));
                  }}
                  placeholder="如：智能评语助手"
                  value={form.name}
                />
              </label>

              <label className="space-y-2">
                <span className="ml-1 block text-sm font-bold text-slate-700">智能体 Key</span>
                <select
                  className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={Boolean(agent) || submitting}
                  onChange={(event) => {
                    const value = readFormValue(event.currentTarget);
                    const key = value as AgentFormState['key'];
                    const nextClassificationMode = getAdminAgentClassificationMode(key);
                    const nextGradeOptions = getAdminAgentGradeOptions(key);

                    setForm((current) => ({
                      ...current,
                      grade:
                        nextClassificationMode === 'none'
                          ? ''
                          : nextGradeOptions.includes(current.grade)
                            ? current.grade
                            : (nextGradeOptions[0] ?? ''),
                      key,
                      subject:
                        nextClassificationMode === 'gradeSubject'
                          ? current.subject || (agentSubjectOptions[0] ?? '')
                          : '',
                    }));
                  }}
                  value={form.key}
                >
                  {agentKeyOptions.map((key) => (
                    <option key={key} value={key}>
                      {WEB_AGENT_MAPPING[key].name} / {key}
                    </option>
                  ))}
                </select>
              </label>

              {classificationMode !== 'none' ? (
                <label className="space-y-2">
                  <span className="ml-1 block text-sm font-bold text-slate-700">年级分类</span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, grade: value }));
                    }}
                    value={form.grade}
                  >
                    <option value="">请选择年级</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {classificationMode === 'gradeSubject' ? (
                <label className="space-y-2">
                  <span className="ml-1 block text-sm font-bold text-slate-700">学科分类</span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, subject: value }));
                    }}
                    value={form.subject}
                  >
                    <option value="">请选择学科</option>
                    {agentSubjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="space-y-6 rounded-[24px] border border-slate-100 bg-slate-50 p-6">
              <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                <Settings2 className="text-primary" size={18} />
                参数与资源配置
              </div>

              <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    模型引擎
                  </span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, engineId: value }));
                    }}
                    value={form.engineId}
                  >
                    <option value="">请选择模型引擎</option>
                    {engines.map((engine) => (
                      <option key={engine.id} value={engine.id}>
                        {engine.name} / {getEngineProviderLabel(engine.provider)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    状态
                  </span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({
                        ...current,
                        status: value as AgentFormState['status'],
                      }));
                    }}
                    value={form.status}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'enabled' ? '启用' : '停用'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    系统提示词 (Prompt)
                  </span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, promptId: value }));
                    }}
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

                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    敏感词库过滤
                  </span>
                  <select
                    className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all outline-none focus:ring-4"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, sensitiveListId: value }));
                    }}
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
              </div>

              <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    温度 ({form.temperature})
                  </span>
                  <div className="flex h-[50px] items-center rounded-xl border border-slate-200 bg-white px-4">
                    <input
                      className="accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
                      max="2"
                      min="0"
                      onChange={(event) => {
                        const value = readFormValue(event.currentTarget);

                        setForm((current) => ({ ...current, temperature: value }));
                      }}
                      step="0.1"
                      type="range"
                      value={form.temperature}
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    Top-P ({form.topP})
                  </span>
                  <div className="flex h-[50px] items-center rounded-xl border border-slate-200 bg-white px-4">
                    <input
                      className="accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
                      max="1"
                      min="0"
                      onChange={(event) => {
                        const value = readFormValue(event.currentTarget);

                        setForm((current) => ({ ...current, topP: value }));
                      }}
                      step="0.1"
                      type="range"
                      value={form.topP}
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="ml-1 block h-4 text-xs font-bold text-slate-500 uppercase">
                    Max Tokens
                  </span>
                  <input
                    className="focus:border-primary focus:ring-primary/10 h-[50px] w-full rounded-xl border border-slate-200 bg-white px-4 transition-all outline-none focus:ring-4"
                    inputMode="numeric"
                    onChange={(event) => {
                      const value = readFormValue(event.currentTarget);

                      setForm((current) => ({ ...current, maxTokens: value }));
                    }}
                    value={form.maxTokens}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 bg-slate-50/50 p-8">
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              取消更改
            </button>
            <button
              className="bg-primary shadow-primary/20 hover:bg-primary-dark flex-1 rounded-2xl py-4 font-bold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? '保存中...' : agent ? '保存更改' : '确认新增智能体'}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}

function toFormState(agent: AdminAgentItem): AgentFormState {
  return {
    engineId: agent.engineId,
    grade: agent.grade ?? '',
    key: agent.key,
    maxTokens: String(agent.maxTokens),
    name: agent.name,
    promptId: agent.promptId ?? '',
    sensitiveListId: agent.sensitiveListId ?? '',
    status: agent.status,
    subject: agent.subject ?? '',
    temperature: String(agent.temperature),
    topP: String(agent.topP),
  };
}

function getEngineProviderLabel(provider: AdminModelEngineItem['provider']): string {
  if (provider === 'custom') {
    return '模型 API 调用';
  }

  return provider;
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

function handleDialogKeyDown(event: KeyboardEvent, onClose: () => void, submitting: boolean) {
  if (event.key === 'Escape') {
    event.preventDefault();

    if (!submitting) {
      onClose();
    }

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
