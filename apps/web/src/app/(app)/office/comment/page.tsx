'use client';

import type { CommentBatchJob, CommentBatchRow, CommentSingleGenerateInput } from '@package/shared';
import { useCallback, useRef, useState } from 'react';

import { BatchCommentTable } from '../../../../components/comments/batch-comment-table';
import { BatchCommentToolbar } from '../../../../components/comments/batch-comment-toolbar';
import { BatchImportGuide } from '../../../../components/comments/batch-import-guide';
import { CommentModeTabs } from '../../../../components/comments/comment-mode-tabs';
import { CommentResultList } from '../../../../components/comments/comment-result-list';
import { defaultCommentTone } from '../../../../components/comments/comment-tags.data';
import { ExcelUploadDropzone } from '../../../../components/comments/excel-upload-dropzone';
import {
  SingleCommentForm,
  type SingleCommentFormValues,
} from '../../../../components/comments/single-comment-form';
import { DonateModal } from '../../../../components/sponsor/donate-modal';
import { useTrpcClient } from '../../../../trpc/provider';

type CommentMode = 'single' | 'batch';

type DownloadLink = {
  click: () => void;
  download: string;
  href: string;
  remove: () => void;
};

type BrowserDownloadEnvironment = {
  URL: {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  atob: (content: string) => string;
  document: {
    body: {
      append: (element: DownloadLink) => void;
    };
    createElement: (tagName: 'a') => DownloadLink;
  };
};

const initialFormValues: SingleCommentFormValues = {
  nickname: '',
  gender: '',
  grade: '',
  tags: [],
  keywords: '',
  tone: defaultCommentTone,
};

const commentModes = [
  { label: '单人生成', mode: 'single' as const },
  { label: '批量生成', mode: 'batch' as const },
];

function getMutationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '评语生成失败，请稍后重试。';
}

function getBatchErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function replaceBatchRow(rows: CommentBatchRow[], nextRow: CommentBatchRow) {
  return rows.map((row) => (row.id === nextRow.id ? nextRow : row));
}

function setRowsFailed(rows: CommentBatchRow[], rowIds: Set<string>, message: string) {
  return rows.map((row) =>
    rowIds.has(row.id) ? { ...row, errorMessage: message, status: 'error' as const } : row
  );
}

function downloadBase64File(contentBase64: string, mimeType: string, fileName: string) {
  const browser = globalThis as unknown as BrowserDownloadEnvironment;
  const binary = browser.atob(contentBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const url = browser.URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const link = browser.document.createElement('a');

  link.href = url;
  link.download = fileName;
  browser.document.body.append(link);
  link.click();
  link.remove();
  browser.URL.revokeObjectURL(url);
}

function buildSingleGenerateInput(
  values: SingleCommentFormValues,
  sessionId: string | undefined
): CommentSingleGenerateInput | null {
  if (!values.gender || !values.grade) {
    return null;
  }

  const nickname = values.nickname.trim();
  const keywords = values.keywords.trim();
  const tone = values.tone.trim() || defaultCommentTone;

  return {
    ...(sessionId ? { sessionId } : {}),
    ...(nickname ? { nickname } : {}),
    gender: values.gender,
    grade: values.grade,
    tags: values.tags,
    ...(keywords ? { keywords } : {}),
    tone,
  };
}

export default function OfficeCommentPage() {
  const client = useTrpcClient();
  const batchUploadRequestRef = useRef(0);
  const [activeMode, setActiveMode] = useState<CommentMode>('single');
  const [formValues, setFormValues] = useState<SingleCommentFormValues>(initialFormValues);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [comments, setComments] = useState<string[]>([]);
  const [creditRemaining, setCreditRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [batchJob, setBatchJob] = useState<CommentBatchJob | null>(null);
  const [batchRows, setBatchRows] = useState<CommentBatchRow[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchGeneratingAll, setBatchGeneratingAll] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [generatingRowId, setGeneratingRowId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchCreditRemaining, setBatchCreditRemaining] = useState<number | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);

  const handleFormChange = useCallback(
    (nextValues: SingleCommentFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.gender && nextValues.grade) {
        setFormError(null);
      }
    },
    [formError]
  );

  const generateComment = useCallback(
    async (values: SingleCommentFormValues) => {
      const input = buildSingleGenerateInput(values, sessionId);

      if (!input) {
        setFormError('请选择性别和年级。');
        return;
      }

      if (loading) {
        return;
      }

      setLoading(true);
      setFormError(null);
      setResultError(null);

      try {
        const result = await client.comments.single.generate.mutate(input);

        setSessionId(result.sessionId);
        setComments(result.comments);
        setCreditRemaining(result.credit.remaining);
      } catch (mutationError) {
        setResultError(getMutationErrorMessage(mutationError));
      } finally {
        setLoading(false);
      }
    },
    [client, loading, sessionId]
  );

  const handleBatchUpload = useCallback(
    async (file: File) => {
      if (batchUploading || batchGeneratingAll || batchExporting || generatingRowId) {
        return;
      }

      const requestId = batchUploadRequestRef.current + 1;

      batchUploadRequestRef.current = requestId;
      setBatchUploading(true);
      setBatchError(null);
      setBatchCreditRemaining(null);

      try {
        const result = await client.comments.batch.createFromUpload.mutate({
          fileName: file.name,
          fileSize: file.size,
          ...(file.type ? { mimeType: file.type } : {}),
        });

        if (batchUploadRequestRef.current === requestId) {
          setBatchJob(result.job);
          setBatchRows(result.rowPreviews);
        }
      } catch (uploadError) {
        if (batchUploadRequestRef.current === requestId) {
          setBatchError(getBatchErrorMessage(uploadError, '批量队列创建失败，请稍后重试。'));
        }
      } finally {
        if (batchUploadRequestRef.current === requestId) {
          setBatchUploading(false);
        }
      }
    },
    [batchExporting, batchGeneratingAll, batchUploading, client, generatingRowId]
  );

  const generateBatchRow = useCallback(
    async (row: CommentBatchRow) => {
      if (!batchJob || batchGeneratingAll || generatingRowId) {
        return;
      }

      setGeneratingRowId(row.id);
      setBatchError(null);
      setBatchRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.id === row.id
            ? { ...currentRow, errorMessage: null, status: 'generating' as const }
            : currentRow
        )
      );

      try {
        const result = await client.comments.batch.generateRow.mutate({
          jobId: batchJob.id,
          rowId: row.id,
        });

        setBatchJob(result.job);
        setBatchRows((currentRows) => replaceBatchRow(currentRows, result.row));
        setBatchCreditRemaining(result.credit.remaining);
      } catch (generateError) {
        const message = getBatchErrorMessage(generateError, '该行评语生成失败，请重试。');

        setBatchError(message);
        setBatchRows((currentRows) => setRowsFailed(currentRows, new Set([row.id]), message));
      } finally {
        setGeneratingRowId(null);
      }
    },
    [batchGeneratingAll, batchJob, client, generatingRowId]
  );

  const generateAllBatchRows = useCallback(async () => {
    if (!batchJob || batchGeneratingAll || generatingRowId) {
      return;
    }

    const rowsToGenerate = batchRows.filter(
      (row) => row.status === 'pending' || row.status === 'error'
    );

    if (rowsToGenerate.length === 0) {
      return;
    }

    setBatchGeneratingAll(true);
    setBatchError(null);

    try {
      let failedRows = 0;

      for (const row of rowsToGenerate) {
        setGeneratingRowId(row.id);
        setBatchRows((currentRows) =>
          currentRows.map((currentRow) =>
            currentRow.id === row.id
              ? { ...currentRow, errorMessage: null, status: 'generating' as const }
              : currentRow
          )
        );

        try {
          const result = await client.comments.batch.generateRow.mutate({
            jobId: batchJob.id,
            rowId: row.id,
          });

          setBatchJob(result.job);
          setBatchRows((currentRows) => replaceBatchRow(currentRows, result.row));
          setBatchCreditRemaining(result.credit.remaining);
        } catch (generateError) {
          failedRows += 1;

          const message = getBatchErrorMessage(generateError, '该行评语生成失败，请重试。');

          setBatchRows((currentRows) => setRowsFailed(currentRows, new Set([row.id]), message));
        }
      }

      if (failedRows > 0) {
        setBatchError('部分评语生成失败，请检查失败行后重试。');
      }
    } finally {
      setGeneratingRowId(null);
      setBatchGeneratingAll(false);
    }
  }, [batchGeneratingAll, batchJob, batchRows, client, generatingRowId]);

  const exportBatchRows = useCallback(async () => {
    const hasSuccessRow = batchRows.some((row) => row.status === 'success');

    if (!batchJob || !hasSuccessRow || batchExporting) {
      return;
    }

    setBatchExporting(true);
    setBatchError(null);

    try {
      const result = await client.comments.batch.export.query({ jobId: batchJob.id });

      downloadBase64File(result.contentBase64, result.mimeType, result.fileName);
    } catch (exportError) {
      setBatchError(getBatchErrorMessage(exportError, '批量评语导出失败，请重试。'));
    } finally {
      setBatchExporting(false);
    }
  }, [batchExporting, batchJob, batchRows, client]);

  const requestBatchExport = useCallback(() => {
    const hasSuccessRow = batchRows.some((row) => row.status === 'success');

    if (!batchJob || !hasSuccessRow || batchExporting || batchGeneratingAll) {
      return;
    }

    setDonateOpen(true);
  }, [batchExporting, batchGeneratingAll, batchJob, batchRows]);

  const closeDonateGate = useCallback(() => {
    setDonateOpen(false);
  }, []);

  const confirmDonateGate = useCallback(() => {
    setDonateOpen(false);
    void exportBatchRows();
  }, [exportBatchRows]);

  return (
    <div className="office-comment-page">
      <section aria-label="评语生成设置" className="office-comment-page__controls">
        <CommentModeTabs
          activeMode={activeMode}
          availableModes={commentModes}
          onModeChange={setActiveMode}
        />
        {activeMode === 'single' ? (
          <SingleCommentForm
            disabled={loading}
            error={formError}
            onChange={handleFormChange}
            onSubmit={generateComment}
            values={formValues}
          />
        ) : (
          <>
            <BatchImportGuide />
            <ExcelUploadDropzone
              disabled={
                batchUploading || batchGeneratingAll || batchExporting || Boolean(generatingRowId)
              }
              error={batchError}
              onFileAccepted={handleBatchUpload}
              uploading={batchUploading}
            />
          </>
        )}
      </section>

      <section className="office-comment-page__results">
        {activeMode === 'single' && resultError ? (
          <div aria-live="assertive" className="office-comment-page__alert" role="alert">
            {resultError}
          </div>
        ) : null}

        {activeMode === 'batch' && batchError ? (
          <div aria-live="assertive" className="office-comment-page__alert" role="alert">
            {batchError}
          </div>
        ) : null}

        {activeMode === 'single' && creditRemaining !== null ? (
          <div className="office-comment-page__credit" aria-live="polite">
            剩余点数：{creditRemaining}
          </div>
        ) : null}

        {activeMode === 'batch' && batchCreditRemaining !== null ? (
          <div className="office-comment-page__credit" aria-live="polite">
            剩余点数：{batchCreditRemaining}
          </div>
        ) : null}

        {activeMode === 'single' ? (
          <CommentResultList comments={comments} loading={loading} />
        ) : (
          <>
            <BatchCommentToolbar
              disabled={batchUploading}
              exporting={batchExporting}
              generatingAll={batchGeneratingAll}
              job={batchJob}
              onExport={requestBatchExport}
              onGenerateAll={generateAllBatchRows}
              rows={batchRows}
            />
            <BatchCommentTable
              disabled={batchUploading || batchExporting}
              generatingAll={batchGeneratingAll}
              generatingRowId={generatingRowId}
              onGenerateRow={generateBatchRow}
              rows={batchRows}
            />
          </>
        )}
      </section>

      <DonateModal
        confirmLabel="继续导出"
        onClose={closeDonateGate}
        onConfirm={confirmDonateGate}
        open={donateOpen}
      />

      <style>{`
        .office-comment-page {
          display: grid;
          min-width: 0;
          flex: 1;
          grid-template-columns: minmax(280px, 390px) minmax(0, 1fr);
          gap: 16px;
        }

        .office-comment-page__controls,
        .office-comment-page__results {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }

        .comment-mode-tabs,
        .single-comment-form,
        .comment-results,
        .batch-import-guide,
        .excel-upload,
        .batch-comment-toolbar,
        .batch-comment-table {
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
        }

        .comment-mode-tabs {
          display: flex;
          gap: 8px;
          padding: 8px;
        }

        .comment-mode-tabs__tab {
          min-height: 36px;
          cursor: pointer;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #4b5563;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 7px 12px;
        }

        .comment-mode-tabs__tab--active {
          border-color: #12645c;
          background: #e3f2ee;
          color: #0f4f47;
        }

        .comment-mode-tabs__tab--disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .batch-import-guide {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .batch-import-guide h2,
        .excel-upload__copy h2,
        .batch-comment-toolbar__summary h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 26px;
        }

        .batch-import-guide p,
        .excel-upload__copy p,
        .batch-comment-toolbar__summary p {
          margin: 3px 0 0;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 20px;
        }

        .batch-import-guide__steps {
          display: grid;
          gap: 8px;
          margin: 0;
          padding-left: 20px;
          color: #374151;
          font-size: 13px;
          line-height: 20px;
        }

        .excel-upload {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
        }

        .excel-upload__dropzone {
          position: relative;
          display: flex;
          min-height: 156px;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px dashed #aab6c5;
          border-radius: 8px;
          background: #f8fafb;
          padding: 16px;
        }

        .excel-upload__dropzone--dragging {
          border-color: #12645c;
          background: #e3f2ee;
        }

        .excel-upload__input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .excel-upload__copy {
          min-width: 0;
        }

        .single-comment-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .single-comment-form__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .comment-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
        }

        .comment-field__label,
        .student-tag-selector legend {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .comment-field__control {
          width: 100%;
          min-height: 38px;
          border: 1px solid #cbd5df;
          border-radius: 6px;
          color: #17202a;
          font: inherit;
          font-size: 14px;
          line-height: 20px;
          padding: 8px 10px;
        }

        .comment-field__textarea {
          min-height: 112px;
          resize: vertical;
        }

        .comment-field__control:focus {
          border-color: #12645c;
          outline: 2px solid rgba(18, 100, 92, 0.18);
          outline-offset: 0;
        }

        .comment-field__control:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .single-comment-form__alert,
        .office-comment-page__alert,
        .comment-results__alert,
        .excel-upload__alert {
          border: 1px solid #f0b8b8;
          border-radius: 6px;
          background: #fff1f1;
          color: #9f1f1f;
          font-size: 13px;
          line-height: 18px;
          padding: 8px 10px;
        }

        .student-tag-selector {
          min-width: 0;
          border: 0;
          margin: 0;
          padding: 0;
        }

        .student-tag-selector__groups {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .student-tag-selector__group {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 7px;
        }

        .student-tag-selector__group p {
          margin: 0;
          color: #5f6b7a;
          font-size: 12px;
          font-weight: 700;
          line-height: 17px;
        }

        .student-tag-selector__options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .student-tag-option {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          gap: 5px;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #f8fafb;
          color: #374151;
          font-size: 13px;
          line-height: 18px;
          padding: 5px 8px;
        }

        .student-tag-option input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: #12645c;
        }

        .single-comment-form__submit,
        .comment-result-card__copy,
        .excel-upload__button,
        .batch-comment-toolbar__button,
        .batch-comment-table__row-button {
          min-height: 38px;
          cursor: pointer;
          border: 0;
          border-radius: 6px;
          background: #12645c;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          line-height: 20px;
          padding: 8px 14px;
        }

        .single-comment-form__submit:hover:not(:disabled),
        .comment-result-card__copy:hover,
        .excel-upload__button:hover:not(:disabled),
        .batch-comment-toolbar__button:hover:not(:disabled),
        .batch-comment-table__row-button:hover:not(:disabled) {
          background: #0f4f47;
        }

        .batch-comment-toolbar__button--secondary {
          border: 1px solid #cbd5df;
          background: #ffffff;
          color: #17202a;
        }

        .batch-comment-toolbar__button--secondary:hover:not(:disabled) {
          border-color: #12645c;
          background: #e3f2ee;
          color: #0f4f47;
        }

        .single-comment-form__submit:disabled,
        .excel-upload__button:disabled,
        .batch-comment-toolbar__button:disabled,
        .batch-comment-table__row-button:disabled,
        .student-tag-option:has(input:disabled) {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .office-comment-page__credit {
          align-self: flex-end;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
        }

        .comment-results {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
        }

        .comment-results__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .comment-results__header h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 26px;
        }

        .comment-results__header p {
          margin: 2px 0 0;
          color: #5f6b7a;
          font-size: 13px;
          line-height: 18px;
        }

        .comment-results__body {
          display: flex;
          min-height: 420px;
          flex: 1;
          flex-direction: column;
          gap: 12px;
        }

        .comment-results__empty {
          display: flex;
          min-height: 320px;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f8fafb;
          color: #5f6b7a;
          text-align: center;
        }

        .comment-results__empty h3 {
          margin: 0 0 8px;
          color: #17202a;
          font-size: 18px;
          line-height: 26px;
        }

        .comment-results__empty p {
          max-width: 360px;
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .comment-result-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 10px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #f8fafb;
          padding: 13px;
        }

        .comment-result-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .comment-result-card__top span {
          color: #4b5563;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .comment-result-card__copy {
          min-width: 74px;
          min-height: 34px;
          padding: 7px 12px;
        }

        .comment-result-card p {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: #17202a;
          font-size: 15px;
          line-height: 24px;
        }

        .batch-comment-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
        }

        .batch-comment-toolbar__summary {
          min-width: 0;
        }

        .batch-comment-toolbar__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .batch-comment-table {
          min-width: 0;
          padding: 0;
          overflow: hidden;
        }

        .batch-comment-table__scroller {
          max-width: 100%;
          overflow-x: auto;
        }

        .batch-comment-table table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
        }

        .batch-comment-table th,
        .batch-comment-table td {
          border-bottom: 1px solid #e5eaf1;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }

        .batch-comment-table th {
          background: #f8fafb;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          line-height: 18px;
        }

        .batch-comment-table td {
          color: #17202a;
          font-size: 14px;
          line-height: 20px;
        }

        .batch-comment-table tr:last-child td {
          border-bottom: 0;
        }

        .batch-comment-table__empty {
          height: 260px;
          color: #5f6b7a;
          text-align: center;
          vertical-align: middle;
        }

        .batch-comment-table__student {
          min-width: 118px;
          font-weight: 700;
        }

        .batch-comment-table__meta {
          display: flex;
          min-width: 220px;
          flex-direction: column;
          gap: 5px;
          color: #4b5563;
        }

        .batch-comment-table__status {
          display: inline-flex;
          min-width: 82px;
          min-height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
          padding: 5px 8px;
        }

        .batch-comment-table__status--pending {
          background: #eef2f7;
          color: #4b5563;
        }

        .batch-comment-table__status--generating {
          background: #e3f2ee;
          color: #0f4f47;
        }

        .batch-comment-table__status--success {
          background: #e7f7ed;
          color: #166534;
        }

        .batch-comment-table__status--error {
          background: #fff1f1;
          color: #9f1f1f;
        }

        .batch-comment-table__row-error {
          display: block;
          max-width: 220px;
          margin-top: 6px;
          color: #9f1f1f;
          font-size: 12px;
          line-height: 17px;
        }

        .batch-comment-table__row-button {
          min-width: 78px;
          min-height: 34px;
          padding: 7px 12px;
        }

        @media (max-width: 980px) {
          .office-comment-page {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .single-comment-form__grid {
            grid-template-columns: 1fr;
          }

          .comment-mode-tabs {
            flex-direction: column;
          }

          .comment-mode-tabs__tab {
            width: 100%;
          }

          .excel-upload__dropzone,
          .batch-comment-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .excel-upload__button,
          .batch-comment-toolbar__button {
            width: 100%;
          }

          .batch-comment-toolbar__actions {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
