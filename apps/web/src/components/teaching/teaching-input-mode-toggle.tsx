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
    <fieldset className="teaching-mode" disabled={disabled}>
      <legend className="teaching-field__label">输入模式</legend>
      <div className="teaching-mode__options">
        {teachingModeOptions.map((item) => (
          <button
            aria-pressed={mode === item.mode}
            className={
              mode === item.mode
                ? 'teaching-mode__button teaching-mode__button--active'
                : 'teaching-mode__button'
            }
            disabled={disabled}
            key={item.mode}
            onClick={() => onChange(item.mode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
