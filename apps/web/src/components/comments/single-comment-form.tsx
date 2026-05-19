'use client';

import type { CommentGender, CommentGrade, CommentTag } from '@package/shared';
import type { ChangeEvent, FormEvent } from 'react';

import { commentGenderOptions, commentGradeOptions, defaultCommentTone } from './comment-tags.data';
import { StudentTagSelector } from './student-tag-selector';

export type SingleCommentFormValues = {
  nickname: string;
  gender: CommentGender | '';
  grade: CommentGrade | '';
  tags: CommentTag[];
  keywords: string;
  tone: string;
};

type SingleCommentFormProps = {
  disabled: boolean;
  error: string | null;
  onChange: (values: SingleCommentFormValues) => void;
  onSubmit: (values: SingleCommentFormValues) => void;
  values: SingleCommentFormValues;
};

function toggleTag(tags: CommentTag[], tag: CommentTag) {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}

export function SingleCommentForm({
  disabled,
  error,
  onChange,
  onSubmit,
  values,
}: SingleCommentFormProps) {
  function updateField(field: keyof SingleCommentFormValues, value: string) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleGenderChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: SingleCommentFormValues['gender'] };

    updateField('gender', target.value);
  }

  function handleGradeChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: SingleCommentFormValues['grade'] };

    updateField('grade', target.value);
  }

  function handleTextChange(field: 'nickname' | 'keywords' | 'tone') {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget as unknown as { value: string };

      updateField(field, target.value);
    };
  }

  function handleTagToggle(tag: CommentTag) {
    onChange({
      ...values,
      tags: toggleTag(values.tags, tag),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form aria-label="单人评语生成表单" className="single-comment-form" onSubmit={handleSubmit}>
      <div className="single-comment-form__grid">
        <label className="comment-field">
          <span className="comment-field__label">学生昵称</span>
          <input
            aria-label="学生昵称"
            className="comment-field__control"
            disabled={disabled}
            onChange={handleTextChange('nickname')}
            placeholder="例如：小林"
            type="text"
            value={values.nickname}
          />
        </label>

        <label className="comment-field">
          <span className="comment-field__label">语气</span>
          <input
            aria-label="语气"
            className="comment-field__control"
            disabled={disabled}
            onChange={handleTextChange('tone')}
            placeholder={defaultCommentTone}
            type="text"
            value={values.tone}
          />
        </label>

        <label className="comment-field">
          <span className="comment-field__label">性别</span>
          <select
            aria-describedby={error ? 'single-comment-form-error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="性别"
            className="comment-field__control"
            disabled={disabled}
            onChange={handleGenderChange}
            value={values.gender}
          >
            <option value="">请选择</option>
            {commentGenderOptions.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </label>

        <label className="comment-field">
          <span className="comment-field__label">年级</span>
          <select
            aria-describedby={error ? 'single-comment-form-error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="年级"
            className="comment-field__control"
            disabled={disabled}
            onChange={handleGradeChange}
            value={values.grade}
          >
            <option value="">请选择</option>
            {commentGradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="single-comment-form__alert" id="single-comment-form-error" role="alert">
          {error}
        </div>
      ) : null}

      <StudentTagSelector
        disabled={disabled}
        onToggle={handleTagToggle}
        selectedTags={values.tags}
      />

      <label className="comment-field">
        <span className="comment-field__label">关键词或细节</span>
        <textarea
          aria-label="关键词或细节"
          className="comment-field__control comment-field__textarea"
          disabled={disabled}
          onChange={handleTextChange('keywords')}
          placeholder="可补充课堂表现、进步点、需要提醒的方向。"
          rows={5}
          value={values.keywords}
        />
      </label>

      <button className="single-comment-form__submit" disabled={disabled} type="submit">
        {disabled ? '生成中...' : '生成评语'}
      </button>
    </form>
  );
}
