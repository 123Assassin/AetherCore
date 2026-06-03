'use client';

import { Lightbulb, RefreshCw } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';

import { gradeOptions, type InspirationFormValues, subjectOptions } from './inspiration.data';

type InspirationFormProps = {
  disabled: boolean;
  error: string | null;
  onChange: (values: InspirationFormValues) => void;
  onSubmit: (values: InspirationFormValues) => void;
  values: InspirationFormValues;
};

export function InspirationForm({
  disabled,
  error,
  onChange,
  onSubmit,
  values,
}: InspirationFormProps) {
  function updateField(field: keyof InspirationFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleSelectChange(field: keyof InspirationFormValues) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleTextChange(field: keyof InspirationFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form
      aria-label="灵感生成表单"
      className="flex min-h-0 w-full shrink-0 flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 lg:h-full lg:w-[340px]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">🎯 授课对象</span>
            <select
              aria-label="学段"
              className="w-full rounded-xl border-0 bg-slate-50/50 px-3 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
              disabled={disabled}
              onChange={handleSelectChange('grade')}
              value={values.grade}
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">📚 学科</span>
            <select
              aria-label="学科"
              className="w-full rounded-xl border-0 bg-slate-50/50 px-3 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
              disabled={disabled}
              onChange={handleSelectChange('subject')}
              value={values.subject}
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            ✏️ 今天想讲点啥？(知识点) <span className="text-rose-500">*</span>
          </span>
          <textarea
            aria-describedby={error ? 'inspiration-topic-error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="主题"
            className="h-24 w-full resize-none rounded-xl border-0 bg-slate-50/50 px-4 py-3 text-sm ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
            disabled={disabled}
            onChange={handleTextChange('topic')}
            placeholder="例如：牛顿第一定律、分数的乘法、李白的《将进酒》..."
            value={values.topic}
          />
        </label>

        {error ? (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            id="inspiration-topic-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            💬 学情与教学习惯{' '}
            <span className="font-normal text-slate-400">(选填，越详细AI越懂你)</span>
          </span>
          <textarea
            aria-label="课堂情境"
            className="h-28 w-full resize-none rounded-xl border-0 bg-slate-50/50 px-4 py-3 text-sm ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
            disabled={disabled}
            onChange={handleTextChange('context')}
            placeholder="例如：上节课刚讲完加减法，学生听得直打瞌睡；我平时喜欢用提问的方式开场..."
            value={values.context}
          />
        </label>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 py-3.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all hover:from-red-700 hover:to-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !values.topic.trim()}
          type="submit"
        >
          {disabled ? (
            <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <Lightbulb aria-hidden="true" className="h-5 w-5" />
          )}
          {disabled ? '脑力激荡中...' : '一键神级精讲'}
        </button>
      </div>
    </form>
  );
}
