'use client';

import { Image as ImageIcon, Lightbulb, Plus, RefreshCw, X } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { readUploadedImages, type UploadedImageFileList } from '../../lib/uploaded-images';
import {
  getDefaultInspirationSubjectForGrade,
  getInspirationSubjectOptions,
  gradeOptions,
  type InspirationFormValues,
  normalizeInspirationSubjectForGrade,
} from './inspiration.data';

type ImageFileInputElement = {
  click: () => void;
};

type ImageFileInputTarget = {
  files?: UploadedImageFileList | null;
  value: string;
};

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
  const fileInputRef = useRef<ImageFileInputElement | null>(null);
  const valuesRef = useRef(values);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const subjectOptions = getInspirationSubjectOptions(values.grade);
  const selectedSubject = normalizeInspirationSubjectForGrade(values.grade, values.subject);
  const submitDisabled = disabled || imageUploading;

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  function handleGradeChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: string };

    const nextValues = {
      ...values,
      grade: target.value,
      subject: getDefaultInspirationSubjectForGrade(target.value),
    };

    valuesRef.current = nextValues;
    onChange(nextValues);
  }

  function handleSubjectChange(event: ChangeEvent<HTMLSelectElement>) {
    const target = event.currentTarget as unknown as { value: string };
    const nextValues = {
      ...values,
      subject: target.value,
    };

    valuesRef.current = nextValues;
    onChange(nextValues);
  }

  function handleTopicChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget as unknown as { value: string };
    const nextValues = {
      ...values,
      topic: target.value,
    };

    valuesRef.current = nextValues;
    onChange(nextValues);
  }

  function handleContextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget as unknown as { value: string };
    const nextValues = {
      ...values,
      context: target.value,
    };

    valuesRef.current = nextValues;
    onChange(nextValues);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (imageUploading) {
      return;
    }

    onSubmit(values);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget as unknown as ImageFileInputTarget;

    setImageUploading(true);
    setImageUploadError(null);

    try {
      const uploadedImages = await readUploadedImages(target.files);

      if (uploadedImages.length === 0) {
        return;
      }

      const latestValues = valuesRef.current;

      const nextValues = {
        ...latestValues,
        uploadedImages: [...latestValues.uploadedImages, ...uploadedImages],
      };

      valuesRef.current = nextValues;
      onChange(nextValues);
    } catch {
      setImageUploadError('图片上传失败，请稍后重试。');
    } finally {
      target.value = '';
      setImageUploading(false);
    }
  }

  function removeUploadedImage(index: number) {
    const nextValues = {
      ...values,
      uploadedImages: values.uploadedImages.filter((_, itemIndex) => itemIndex !== index),
    };

    valuesRef.current = nextValues;
    onChange(nextValues);
  }

  return (
    <form
      aria-label="灵感生成表单"
      className="flex flex-col rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6"
      onSubmit={handleSubmit}
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">🎯 年级</span>
            <select
              aria-label="年级"
              className="w-full rounded-xl border-0 bg-slate-50/50 px-3 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
              disabled={disabled}
              onChange={handleGradeChange}
              onInput={handleGradeChange}
              value={values.grade}
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">📚 学科</span>
            <select
              aria-label="学科"
              className="w-full rounded-xl border-0 bg-slate-50/50 px-3 py-2.5 text-sm ring-1 ring-slate-200 transition-all outline-none hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
              disabled={disabled}
              onChange={handleSubjectChange}
              value={selectedSubject}
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700" htmlFor="inspiration-topic">
              ✏️ 今天想讲点啥？(知识点) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {imageUploading ? (
                <span className="text-[11px] font-medium text-slate-500" role="status">
                  上传中...
                </span>
              ) : null}
              <button
                aria-busy={imageUploading}
                aria-label={imageUploading ? '图片上传中' : '上传知识点图片'}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || imageUploading}
                onClick={() => fileInputRef.current?.click()}
                title={imageUploading ? '图片上传中' : '上传图片'}
                type="button"
              >
                {imageUploading ? (
                  <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                ref={(element) => {
                  fileInputRef.current = element as unknown as ImageFileInputElement | null;
                }}
                type="file"
              />
            </div>
          </div>
          <textarea
            aria-describedby={error ? 'inspiration-topic-error' : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="主题"
            className="h-24 w-full resize-none rounded-xl border-0 bg-slate-50/50 px-4 py-3 text-sm ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
            disabled={disabled}
            id="inspiration-topic"
            onChange={handleTopicChange}
            placeholder="例如：牛顿第一定律、分数的乘法、李白的《将进酒》..."
            value={values.topic}
          />

          {values.uploadedImages.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {values.uploadedImages.map((image, index) => (
                <div className="group relative w-[30%]" key={`${image.name}-${index}`}>
                  <img
                    alt={image.name || '上传图片'}
                    className="h-16 w-full rounded-lg object-cover shadow-sm ring-1 ring-slate-200"
                    src={
                      image.url ?? (image.data ? `data:${image.mimeType};base64,${image.data}` : '')
                    }
                  />
                  <button
                    aria-label="移除知识点图片"
                    className="absolute -top-1.5 -right-1.5 rounded-full border border-slate-100 bg-white p-1 text-slate-400 shadow-md transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || imageUploading}
                    onClick={() => removeUploadedImage(index)}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                aria-label="继续添加知识点图片"
                className="flex h-16 w-[30%] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 text-slate-300 transition-all hover:border-red-200 hover:bg-red-50/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || imageUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {imageUploading ? (
                  <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus aria-hidden="true" className="h-5 w-5" />
                )}
                <span className="text-[10px] font-bold">
                  {imageUploading ? '上传中...' : '添加'}
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {imageUploadError ? (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            role="alert"
          >
            {imageUploadError}
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            id="inspiration-topic-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            💬 学情与教学习惯{' '}
            <span className="font-normal text-slate-400">(选填，越详细AI越懂你)</span>
          </span>
          <textarea
            aria-label="课堂情境"
            className="h-28 w-full resize-none rounded-xl border-0 bg-slate-50/50 px-4 py-3 text-sm ring-1 ring-slate-200 transition-all outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:ring-2 focus:ring-violet-500"
            disabled={disabled}
            onChange={handleContextChange}
            placeholder="例如：上节课刚讲完加减法，学生听得直打瞌睡；我平时喜欢用提问的方式开场..."
            value={values.context}
          />
        </label>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 py-3.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all hover:from-red-700 hover:to-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitDisabled}
          type="submit"
        >
          {submitDisabled ? (
            <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <Lightbulb aria-hidden="true" className="h-5 w-5" />
          )}
          {disabled ? '脑力激荡中...' : imageUploading ? '图片上传中...' : '一键神级精讲'}
        </button>
      </div>
    </form>
  );
}
