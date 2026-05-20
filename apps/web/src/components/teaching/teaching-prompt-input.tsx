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
    <textarea
      aria-describedby={error ? 'teaching-prompt-error' : undefined}
      aria-invalid={error ? true : undefined}
      aria-label={copy.inputLabel}
      className="h-56 w-full resize-none rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 text-sm leading-relaxed font-medium shadow-inner transition-all outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-blue-600/20"
      disabled={disabled}
      onChange={handleChange}
      placeholder={copy.placeholder}
      rows={8}
      value={values.prompt}
    />
  );
}
