'use client';

import type { ChangeEvent } from 'react';

import {
  getDefaultTeachingSubjectForStage,
  getTeachingSubjectOptions,
  normalizeTeachingSubjectForStage,
  type TeachingFormValues,
  teachingStageOptions,
} from './teaching.data';

type TeachingContextFormProps = {
  disabled: boolean;
  onChange: (values: TeachingFormValues) => void;
  values: TeachingFormValues;
};

export function TeachingContextForm({ disabled, onChange, values }: TeachingContextFormProps) {
  const subjectOptions = getTeachingSubjectOptions(values.stage);
  const selectedSubject = normalizeTeachingSubjectForStage(values.stage, values.subject);

  function updateField(field: 'subject' | 'textbookVersion', value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleStageChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: string };

    onChange({
      ...values,
      stage: target.value,
      subject: getDefaultTeachingSubjectForStage(target.value),
    });
  }

  function handleSubjectChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: string };

    updateField('subject', target.value);
  }

  function handleTextbookVersionChange(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget as unknown as { value: string };

    updateField('textbookVersion', target.value);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-2">
        <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">年级</span>
        <select
          aria-label="年级"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={disabled}
          onChange={handleStageChange}
          onInput={handleStageChange}
          value={values.stage}
        >
          {teachingStageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">学科</span>
        <select
          aria-label="学科"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={disabled}
          onChange={handleSubjectChange}
          value={selectedSubject}
        >
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>

      <label className="col-span-2 space-y-2">
        <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">教程版本</span>
        <input
          aria-label="教程版本"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={disabled}
          onChange={handleTextbookVersionChange}
          placeholder="例如：人教版、北师大版"
          value={values.textbookVersion}
        />
      </label>
    </div>
  );
}
