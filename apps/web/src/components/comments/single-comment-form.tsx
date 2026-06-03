'use client';

import {
  agentSubjectOptions,
  type CommentGender,
  type CommentGrade,
  type CommentTag,
} from '@package/shared';
import { Sparkles } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';

import { commentGenderOptions, commentGradeOptions, defaultCommentTone } from './comment-tags.data';
import { StudentTagSelector } from './student-tag-selector';

export type SingleCommentFormValues = {
  nickname: string;
  gender: CommentGender | '';
  grade: CommentGrade | '';
  subject: string;
  tags: CommentTag[];
  keywords: string;
  tone: string;
};

type SingleCommentFormProps = {
  disabled: boolean;
  error: string | null;
  onChange: (values: SingleCommentFormValues) => void;
  onSubmit: (values: SingleCommentFormValues) => void;
  values: SingleCommentFormValues;
};

function toggleTag(tags: CommentTag[], tag: CommentTag) {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}

export function SingleCommentForm({
  disabled,
  error,
  onChange,
  onSubmit,
  values,
}: SingleCommentFormProps) {
  function updateField(field: keyof SingleCommentFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleGenderChange(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget as unknown as { value: SingleCommentFormValues['gender'] };

    updateField('gender', target.value);
  }

  function handleGradeChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: SingleCommentFormValues['grade'] };

    updateField('grade', target.value);
  }

  function handleSubjectChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: string };

    updateField('subject', target.value);
  }

  function handleTextChange(field: 'nickname' | 'keywords' | 'tone') {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleTagToggle(tag: CommentTag) {
    onChange({
      ...values,
      tags: toggleTag(values.tags, tag),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form
      aria-label="单人评语生成表单"
      className="h-fit space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 md:p-6"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">学生昵称/标识</span>
          <input
            aria-label="学生昵称"
            className="w-full rounded-xl border-0 bg-slate-50/50 px-4 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"
            disabled={disabled}
            onChange={handleTextChange('nickname')}
            placeholder="如：小明 / A同学"
            type="text"
            value={values.nickname}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">年级</span>
          <select
            aria-describedby={error ? 'single-comment-form-error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="年级"
            className="w-full rounded-xl border-0 bg-slate-50/50 px-4 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"
            disabled={disabled}
            onChange={handleGradeChange}
            value={values.grade}
          >
            <option value="">请选择</option>
            {commentGradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">学科</span>
          <select
            aria-label="学科"
            className="w-full rounded-xl border-0 bg-slate-50/50 px-4 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"
            disabled={disabled}
            onChange={handleSubjectChange}
            value={values.subject}
          >
            <option value="">请选择</option>
            {agentSubjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-xs font-bold text-slate-700">性别</legend>
        <div className="flex gap-6">
          {commentGenderOptions.map((gender) => (
            <label className="flex cursor-pointer items-center gap-2" key={gender}>
              <input
                checked={values.gender === gender}
                className="h-4 w-4 accent-emerald-600"
                disabled={disabled}
                name="gender"
                onChange={handleGenderChange}
                type="radio"
                value={gender}
              />
              <span className="text-sm font-medium text-slate-700">{gender}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-700">评价语气</span>
        <input
          aria-label="语气"
          className="w-full rounded-xl border-0 bg-slate-50/50 px-4 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"
          disabled={disabled}
          onChange={handleTextChange('tone')}
          placeholder={defaultCommentTone}
          type="text"
          value={values.tone}
        />
      </label>

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
          id="single-comment-form-error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <StudentTagSelector
        disabled={disabled}
        onToggle={handleTagToggle}
        selectedTags={values.tags}
      />

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-700">个性化细节补充</span>
        <textarea
          aria-label="关键词或细节"
          className="h-24 w-full resize-none rounded-xl border-0 bg-slate-50/50 px-4 py-3 text-sm ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500"
          disabled={disabled}
          onChange={handleTextChange('keywords')}
          placeholder="细节描述..."
          rows={5}
          value={values.keywords}
        />
      </label>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        <Sparkles className="h-4 w-4" />
        {disabled ? '正在生成...' : '一键生成评语'}
      </button>
    </form>
  );
}
