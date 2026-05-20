'use client';

import { RefreshCw } from 'lucide-react';

import {
  getTeachingLevelOptions,
  type TeachingFormValues,
  type TeachingLevel,
} from './teaching.data';

type TransformationLevelSelectorProps = {
  disabled: boolean;
  onChange: (values: TeachingFormValues) => void;
  values: TeachingFormValues;
};

export function TransformationLevelSelector({
  disabled,
  onChange,
  values,
}: TransformationLevelSelectorProps) {
  const options = getTeachingLevelOptions(values.mode);

  function handleLevelChange(level: TeachingLevel) {
    onChange({
      ...values,
      level,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((option) => {
        const selected = values.level === option.id;

        return (
          <button
            aria-pressed={selected}
            className={`flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
              selected
                ? 'border-blue-600 bg-white shadow-lg shadow-blue-50'
                : 'border-white bg-white hover:border-slate-100'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            disabled={disabled}
            key={option.id}
            onClick={() => handleLevelChange(option.id)}
            type="button"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${selected ? 'animate-spin' : ''}`} />
            </span>
            <span>
              <span
                className={`block text-sm font-black ${
                  selected ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight font-medium text-slate-400">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
