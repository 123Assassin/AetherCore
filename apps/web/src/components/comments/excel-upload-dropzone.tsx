'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useRef, useState } from 'react';

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
  click: () => void;
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
  const inputRef = useRef<FileInputTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dropzoneClassName = isDragging
    ? 'excel-upload__dropzone excel-upload__dropzone--dragging'
    : 'excel-upload__dropzone';
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const dataTransfer = event.dataTransfer as unknown as DropDataTransfer;

    event.preventDefault();
    setIsDragging(false);
    acceptFile(dataTransfer.files[0]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  return (
    <section aria-label="上传批量评语表格" className="excel-upload">
      <div
        className={dropzoneClassName}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept={excelAcceptValue}
          aria-hidden="true"
          className="excel-upload__input"
          disabled={disabled}
          onChange={handleInputChange}
          ref={(node) => {
            inputRef.current = node as FileInputTarget | null;
          }}
          tabIndex={-1}
          type="file"
        />
        <div className="excel-upload__copy">
          <h2>{uploading ? '正在创建队列' : '上传 Excel'}</h2>
          <p>拖拽文件到这里，或选择本地 .xlsx / .xls 文件。</p>
        </div>
        <button
          aria-describedby={visibleError ? 'excel-upload-error' : undefined}
          className="excel-upload__button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          选择文件
        </button>
      </div>

      {visibleError ? (
        <div
          aria-live="assertive"
          className="excel-upload__alert"
          id="excel-upload-error"
          role="alert"
        >
          {visibleError}
        </div>
      ) : null}
    </section>
  );
}
