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
    <div className="teaching-form__grid">
      <label className="teaching-field">
        <span className="teaching-field__label">学科选择</span>
        <select
          aria-label="学科选择"
          className="teaching-field__control"
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

      <label className="teaching-field">
        <span className="teaching-field__label">学段选择</span>
        <select
          aria-label="学段选择"
          className="teaching-field__control"
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
