'use client';

import type { ChangeEvent } from 'react';

import { type TeachingFormValues, teachingModeCopy } from './teaching.data';

type TeachingPromptInputProps = {
  disabled: boolean;
  error: string | null;
  onChange: (values: TeachingFormValues) => void;
  values: TeachingFormValues;
};

export function TeachingPromptInput({
  disabled,
  error,
  onChange,
  values,
}: TeachingPromptInputProps) {
  const copy = teachingModeCopy[values.mode];

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget as unknown as { value: string };

    onChange({
      ...values,
      prompt: target.value,
    });
  }

  return (
    <label className="teaching-field">
      <span className="teaching-field__label">{copy.inputLabel}</span>
      <textarea
        aria-describedby={error ? 'teaching-prompt-error' : undefined}
        aria-invalid={error ? true : undefined}
        aria-label={copy.inputLabel}
        className="teaching-field__control teaching-field__textarea"
        disabled={disabled}
        onChange={handleChange}
        placeholder={copy.placeholder}
        rows={6}
        value={values.prompt}
      />
    </label>
  );
}
