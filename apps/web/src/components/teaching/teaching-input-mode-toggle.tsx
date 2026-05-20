'use client';

import { type TeachingMode, teachingModeOptions } from './teaching.data';

type TeachingInputModeToggleProps = {
  disabled: boolean;
  mode: TeachingMode;
  onChange: (mode: TeachingMode) => void;
};

export function TeachingInputModeToggle({
  disabled,
  mode,
  onChange,
}: TeachingInputModeToggleProps) {
  return (
    <div aria-label="输入模式" className="flex rounded-lg bg-slate-200/50 p-1">
      {teachingModeOptions.map((item) => (
        <button
          aria-pressed={mode === item.mode}
          className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
            mode === item.mode
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          disabled={disabled}
          key={item.mode}
          onClick={() => onChange(item.mode)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
