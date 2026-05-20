'use client';

import { UploadCloud } from 'lucide-react';
import type { ChangeEvent, DragEvent } from 'react';
import { useId, useState } from 'react';

const supportedExcelExtensions = ['.xlsx', '.xls'] as const;
const maxExcelFileSizeBytes = 10 * 1024 * 1024;
const excelAcceptValue = [
  '.xlsx',
  '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
].join(',');

type ExcelUploadDropzoneProps = {
  disabled: boolean;
  error: string | null;
  onFileAccepted: (file: File) => void;
  uploading: boolean;
};

type FileInputTarget = {
  files?: {
    [index: number]: File | undefined;
  };
  value: string;
};

type DropDataTransfer = {
  files: {
    [index: number]: File | undefined;
  };
};

function hasSupportedExcelExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase();

  return supportedExcelExtensions.some((extension) => normalizedName.endsWith(extension));
}

function getUnsupportedFileMessage(file: File) {
  if (!hasSupportedExcelExtension(file.name)) {
    return '仅支持 .xlsx 或 .xls 文件。';
  }

  if (file.size <= 0) {
    return '文件内容为空，请重新选择。';
  }

  if (file.size > maxExcelFileSizeBytes) {
    return '文件不能超过 10MB。';
  }

  return null;
}

export function ExcelUploadDropzone({
  disabled,
  error,
  onFileAccepted,
  uploading,
}: ExcelUploadDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? error;

  function acceptFile(file: File | undefined) {
    if (!file || disabled) {
      return;
    }

    const unsupportedMessage = getUnsupportedFileMessage(file);

    if (unsupportedMessage) {
      setLocalError(unsupportedMessage);
      return;
    }

    setLocalError(null);
    onFileAccepted(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget as unknown as FileInputTarget;

    acceptFile(target.files?.[0]);
    target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    const dataTransfer = event.dataTransfer as unknown as DropDataTransfer;

    event.preventDefault();
    setIsDragging(false);
    acceptFile(dataTransfer.files[0]);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  return (
    <section
      aria-label="上传批量评语表格"
      className="flex flex-1 flex-col items-center justify-center p-8 text-center md:p-12"
    >
      <label
        className={`group flex w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-[2.5rem] border-4 border-dashed p-10 transition-all md:p-16 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50/50'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        htmlFor={inputId}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept={excelAcceptValue}
          aria-describedby={visibleError ? 'excel-upload-error' : undefined}
          className="sr-only"
          disabled={disabled}
          id={inputId}
          onChange={handleInputChange}
          type="file"
        />
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-emerald-50 shadow-inner shadow-emerald-100/50 transition-transform group-hover:scale-110">
          <UploadCloud className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-xl font-black tracking-tight text-slate-700">
          {uploading ? '正在创建队列' : '点击或拖拽上传表格'}
        </h3>
        <p className="max-w-[260px] text-sm leading-relaxed font-medium text-slate-400">
          支持 .xlsx / .xls 格式文件
          <br />
          请确保表格内容符合模板格式
        </p>
      </label>

      {visibleError ? (
        <div
          aria-live="assertive"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
          id="excel-upload-error"
          role="alert"
        >
          {visibleError}
        </div>
      ) : null}
    </section>
  );
}
