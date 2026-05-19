'use client';

import type { ChangeEvent, FormEvent } from 'react';

import { gradeOptions, type InspirationFormValues, subjectOptions } from './inspiration.data';

type InspirationFormProps = {
  disabled: boolean;
  error: string | null;
  onChange: (values: InspirationFormValues) => void;
  onSubmit: (values: InspirationFormValues) => void;
  values: InspirationFormValues;
};

export function InspirationForm({
  disabled,
  error,
  onChange,
  onSubmit,
  values,
}: InspirationFormProps) {
  function updateField(field: keyof InspirationFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleSelectChange(field: keyof InspirationFormValues) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleTextChange(field: keyof InspirationFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form aria-label="灵感生成表单" className="inspiration-form" onSubmit={handleSubmit}>
      <div className="inspiration-form__grid">
        <label className="inspiration-field">
          <span className="inspiration-field__label">学段</span>
          <select
            aria-label="学段"
            className="inspiration-field__control"
            disabled={disabled}
            onChange={handleSelectChange('grade')}
            value={values.grade}
          >
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>

        <label className="inspiration-field">
          <span className="inspiration-field__label">学科</span>
          <select
            aria-label="学科"
            className="inspiration-field__control"
            disabled={disabled}
            onChange={handleSelectChange('subject')}
            value={values.subject}
          >
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="inspiration-field">
        <span className="inspiration-field__label">主题</span>
        <input
          aria-describedby={error ? 'inspiration-topic-error' : undefined}
          aria-invalid={error ? true : undefined}
          aria-label="主题"
          className="inspiration-field__control"
          disabled={disabled}
          onChange={handleTextChange('topic')}
          placeholder="例如：二次函数的图像与性质"
          type="text"
          value={values.topic}
        />
      </label>

      {error ? (
        <div className="inspiration-form__alert" id="inspiration-topic-error" role="alert">
          {error}
        </div>
      ) : null}

      <label className="inspiration-field">
        <span className="inspiration-field__label">课堂情境</span>
        <textarea
          aria-label="课堂情境"
          className="inspiration-field__control inspiration-field__textarea"
          disabled={disabled}
          onChange={handleTextChange('context')}
          placeholder="可补充学生基础、课时目标、已有素材或限制条件。"
          rows={4}
          value={values.context}
        />
      </label>

      <button className="inspiration-form__submit" disabled={disabled} type="submit">
        {disabled ? '生成中...' : '生成课程灵感'}
      </button>
    </form>
  );
}
