'use client';

import type { ChangeEvent } from 'react';

import {
  type TeachingFormValues,
  teachingStageOptions,
  teachingSubjectOptions,
} from './teaching.data';

type TeachingContextFormProps = {
  disabled: boolean;
  onChange: (values: TeachingFormValues) => void;
  values: TeachingFormValues;
};

export function TeachingContextForm({ disabled, onChange, values }: TeachingContextFormProps) {
  function updateField(field: 'subject' | 'stage', value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleSelectChange(field: 'subject' | 'stage') {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-2">
        <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">学科选择</span>
        <select
          aria-label="学科选择"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={disabled}
          onChange={handleSelectChange('subject')}
          value={values.subject}
        >
          {teachingSubjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="ml-1 text-[10px] font-black text-slate-400 uppercase">学段选择</span>
        <select
          aria-label="学段选择"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={disabled}
          onChange={handleSelectChange('stage')}
          value={values.stage}
        >
          {teachingStageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
