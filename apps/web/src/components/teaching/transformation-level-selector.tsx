'use client';

import {
  getTeachingLevelOptions,
  type TeachingFormValues,
  type TeachingLevel,
  teachingModeCopy,
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
  const copy = teachingModeCopy[values.mode];

  function handleLevelChange(level: TeachingLevel) {
    onChange({
      ...values,
      level,
    });
  }

  return (
    <fieldset className="teaching-levels" disabled={disabled}>
      <legend className="teaching-field__label">{copy.levelLabel}</legend>
      <div className="teaching-levels__list">
        {options.map((option) => (
          <button
            aria-pressed={values.level === option.id}
            className={
              values.level === option.id
                ? 'teaching-levels__button teaching-levels__button--active'
                : 'teaching-levels__button'
            }
            disabled={disabled}
            key={option.id}
            onClick={() => handleLevelChange(option.id)}
            type="button"
          >
            <span className="teaching-levels__title">{option.label}</span>
            <span className="teaching-levels__description">{option.description}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
