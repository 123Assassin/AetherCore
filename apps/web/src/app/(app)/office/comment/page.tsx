'use client';

import type { CommentBatchJob, CommentBatchRow, CommentSingleGenerateInput } from '@package/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { ExportAdModal, GenerationAdOverlay } from '../../../../components/sponsor/ad-system';
import { useChatHistory } from '../../../../contexts/chat-history-context';
import { useAiGenerationAdGate } from '../../../../hooks/use-ai-generation-ad-gate';
import { generateSingleCommentStream } from '../../../../lib/comment-stream';
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

type BrowserBase64Environment = {
  btoa: (content: string) => string;
};

type CommentHistoryState = {
  activeMode: CommentMode;
  comments: string[];
  creditRemaining: number | null;
  formValues: SingleCommentFormValues;
  kind: 'comment';
  sessionId?: string;
};

const initialFormValues: SingleCommentFormValues = {
  nickname: '',
  gender: '男',
  grade: '五年级',
  subject: '语文',
  tags: [],
  keywords: '',
  tone: defaultCommentTone,
};

const commentModes = [
  { label: '单人评语精编', mode: 'single' as const },
  { label: '批量表格导入', mode: 'batch' as const },
];
const streamPreviewIntervalMs = 24;
const streamPreviewChunkSize = 3;

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

async function readFileAsBase64(file: File): Promise<string> {
  const browser = globalThis as unknown as BrowserBase64Environment;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 8192;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return browser.btoa(binary);
}

function previewStreamedComments(content: string): string[] {
  const trimmed = content.trim();

  if (!trimmed) {
    return [];
  }

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const comments = lines.some((line) => isCommentHeading(stripCommentLineMarker(line)))
    ? groupHeadingComments(lines)
    : lines.map(stripCommentLineMarker).filter(Boolean);

  return comments.length > 0 ? comments : [trimmed];
}

function groupHeadingComments(lines: string[]): string[] {
  const comments: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const cleanedLine = stripCommentLineMarker(line);

    if (isCommentHeading(cleanedLine) && current.length > 0) {
      comments.push(current.join('\n'));
      current = [];
    }

    current.push(cleanedLine);
  }

  if (current.length > 0) {
    comments.push(current.join('\n'));
  }

  return comments.filter(Boolean);
}

function isCommentHeading(line: string): boolean {
  const trimmed = line.trim();

  return /^#{1,6}\s+\S/.test(trimmed) || (/^\*\*.+\*\*$/.test(trimmed) && trimmed.length <= 80);
}

function stripCommentLineMarker(line: string): string {
  return line.trim().replace(/^(?:(?:[-*])\s+|\d+[.)、]\s*)/, '');
}

function createStreamPreviewWriter(onPreview: (content: string) => void) {
  let targetContent = '';
  let visibleLength = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let finishResolve: (() => void) | null = null;

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function resolveFinishedIfIdle() {
    if (visibleLength < targetContent.length) {
      return;
    }

    stopInterval();

    if (finishResolve) {
      finishResolve();
      finishResolve = null;
    }
  }

  function revealNextChunk() {
    if (visibleLength < targetContent.length) {
      visibleLength = Math.min(visibleLength + streamPreviewChunkSize, targetContent.length);
      onPreview(targetContent.slice(0, visibleLength));
    }

    resolveFinishedIfIdle();
  }

  function ensureInterval() {
    if (!intervalId) {
      intervalId = setInterval(revealNextChunk, streamPreviewIntervalMs);
    }
  }

  return {
    append(content: string) {
      targetContent += content;

      if (visibleLength < targetContent.length) {
        ensureInterval();
      }
    },
    finish() {
      if (visibleLength >= targetContent.length) {
        return Promise.resolve();
      }

      ensureInterval();

      return new Promise<void>((resolve) => {
        finishResolve = resolve;
      });
    },
    stop() {
      stopInterval();
      finishResolve = null;
    },
  };
}

function buildSingleGenerateInput(
  values: SingleCommentFormValues,
  sessionId: string | undefined
): CommentSingleGenerateInput | null {
  if (!values.gender || !values.grade || !values.subject) {
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
    subject: values.subject,
    tags: values.tags,
    ...(keywords ? { keywords } : {}),
    tone,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCommentHistoryState(value: unknown): CommentHistoryState | null {
  if (!isRecord(value) || value.kind !== 'comment' || !isRecord(value.formValues)) {
    return null;
  }

  return {
    activeMode: value.activeMode === 'batch' ? 'batch' : 'single',
    comments: Array.isArray(value.comments)
      ? value.comments.filter((item): item is string => typeof item === 'string')
      : [],
    creditRemaining: typeof value.creditRemaining === 'number' ? value.creditRemaining : null,
    formValues: {
      ...initialFormValues,
      ...value.formValues,
    } as SingleCommentFormValues,
    kind: 'comment',
    ...(typeof value.sessionId === 'string' ? { sessionId: value.sessionId } : {}),
  };
}

function createCommentHistoryMessages(state: CommentHistoryState) {
  const label = state.formValues.nickname.trim() || '学生评语';
  const request = `评语生成：${label}`;

  return [
    {
      content: request,
      id: `comment-user-${Date.now()}`,
      role: 'user' as const,
      timestamp: new Date().toISOString(),
    },
    ...(state.comments.length
      ? [
          {
            content: state.comments.join('\n\n'),
            id: `comment-assistant-${Date.now()}`,
            role: 'assistant' as const,
            timestamp: new Date().toISOString(),
          },
        ]
      : []),
  ];
}

export default function OfficeCommentPage() {
  const client = useTrpcClient();
  const { currentSessionIds, sessions, setCurrentSessionId, upsertSession } = useChatHistory();
  const { adMode, adOpen, closeAdGate, runWithAdGate } = useAiGenerationAdGate();
  const batchUploadRequestRef = useRef(0);
  const appliedSessionIdRef = useRef<string | null | undefined>(undefined);
  const currentHistorySessionId = currentSessionIds.comment;
  const activeHistorySession = useMemo(
    () => sessions.find((session) => session.id === currentHistorySessionId),
    [currentHistorySessionId, sessions]
  );
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
  const [exportAdOpen, setExportAdOpen] = useState(false);

  const persistCommentSession = useCallback(
    (state: CommentHistoryState) => {
      const historySessionId = currentHistorySessionId ?? `comment-${Date.now()}`;

      if (!currentHistorySessionId) {
        setCurrentSessionId('comment', historySessionId);
        appliedSessionIdRef.current = historySessionId;
      }

      upsertSession({
        category: 'comment',
        id: historySessionId,
        messages: createCommentHistoryMessages(state),
        ...(state.sessionId ? { serverSessionId: state.sessionId } : {}),
        state: state as unknown as Record<string, unknown>,
        title: state.formValues.nickname.trim() || '学生评语',
        updatedAt: Date.now(),
      });
    },
    [currentHistorySessionId, setCurrentSessionId, upsertSession]
  );

  useEffect(() => {
    if (appliedSessionIdRef.current === currentHistorySessionId) {
      return;
    }

    appliedSessionIdRef.current = currentHistorySessionId;

    const state = readCommentHistoryState(activeHistorySession?.state);

    const timeoutId = setTimeout(() => {
      if (!currentHistorySessionId || !state) {
        setActiveMode('single');
        setFormValues(initialFormValues);
        setSessionId(undefined);
        setComments([]);
        setCreditRemaining(null);
        setFormError(null);
        setResultError(null);
        setBatchJob(null);
        setBatchRows([]);
        setBatchError(null);
        setBatchCreditRemaining(null);
        return;
      }

      setActiveMode(state.activeMode);
      setFormValues(state.formValues);
      setSessionId(state.sessionId);
      setComments(state.comments);
      setCreditRemaining(state.creditRemaining);
      setFormError(null);
      setResultError(null);
      setBatchJob(null);
      setBatchRows([]);
      setBatchError(null);
      setBatchCreditRemaining(null);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeHistorySession?.state, currentHistorySessionId]);

  const handleFormChange = useCallback(
    (nextValues: SingleCommentFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.gender && nextValues.grade && nextValues.subject) {
        setFormError(null);
      }

      if (currentHistorySessionId) {
        persistCommentSession({
          activeMode,
          comments,
          creditRemaining,
          formValues: nextValues,
          kind: 'comment',
          ...(sessionId ? { sessionId } : {}),
        });
      }
    },
    [
      activeMode,
      comments,
      creditRemaining,
      currentHistorySessionId,
      formError,
      persistCommentSession,
      sessionId,
    ]
  );

  const handleModeChange = useCallback(
    (nextMode: CommentMode) => {
      setActiveMode(nextMode);

      if (currentHistorySessionId) {
        persistCommentSession({
          activeMode: nextMode,
          comments,
          creditRemaining,
          formValues,
          kind: 'comment',
          ...(sessionId ? { sessionId } : {}),
        });
      }
    },
    [
      comments,
      creditRemaining,
      currentHistorySessionId,
      formValues,
      persistCommentSession,
      sessionId,
    ]
  );

  const generateComment = useCallback(
    (values: SingleCommentFormValues) => {
      const input = buildSingleGenerateInput(values, sessionId);

      if (!input) {
        setFormError('请选择性别、年级和学科。');
        return;
      }

      if (loading) {
        return;
      }

      runWithAdGate(async () => {
        setLoading(true);
        setFormError(null);
        setResultError(null);
        setComments([]);

        const previewWriter = createStreamPreviewWriter((content) => {
          setComments(previewStreamedComments(content));
        });

        try {
          const result = await generateSingleCommentStream(input, {
            onDelta: (content) => {
              previewWriter.append(content);
            },
          });

          await previewWriter.finish();
          setSessionId(result.sessionId);
          setComments(result.comments);
          setCreditRemaining(result.credit.remaining);
          persistCommentSession({
            activeMode: 'single',
            comments: result.comments,
            creditRemaining: result.credit.remaining,
            formValues: values,
            kind: 'comment',
            sessionId: result.sessionId,
          });
        } catch (mutationError) {
          previewWriter.stop();
          setComments([]);
          setResultError(getMutationErrorMessage(mutationError));
        } finally {
          setLoading(false);
        }
      });
    },
    [loading, persistCommentSession, runWithAdGate, sessionId]
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
        const contentBase64 = await readFileAsBase64(file);
        const result = await client.comments.batch.createFromUpload.mutate({
          contentBase64,
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
    (row: CommentBatchRow) => {
      if (!batchJob || batchGeneratingAll || generatingRowId) {
        return;
      }

      runWithAdGate(async () => {
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
      });
    },
    [batchGeneratingAll, batchJob, client, generatingRowId, runWithAdGate]
  );

  const generateAllBatchRows = useCallback(() => {
    if (!batchJob || batchGeneratingAll || generatingRowId) {
      return;
    }

    const rowsToGenerate = batchRows.filter(
      (row) => row.status === 'pending' || row.status === 'error'
    );

    if (rowsToGenerate.length === 0) {
      return;
    }

    runWithAdGate(async () => {
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
    });
  }, [batchGeneratingAll, batchJob, batchRows, client, generatingRowId, runWithAdGate]);

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

    setExportAdOpen(true);
  }, [batchExporting, batchGeneratingAll, batchJob, batchRows]);

  const closeExportAdGate = useCallback(() => {
    setExportAdOpen(false);
  }, []);

  const confirmExportAdGate = useCallback(() => {
    setExportAdOpen(false);
    void exportBatchRows();
  }, [exportBatchRows]);

  const resetBatchUpload = useCallback(() => {
    if (batchUploading || batchGeneratingAll || batchExporting || generatingRowId) {
      return;
    }

    setBatchJob(null);
    setBatchRows([]);
    setBatchError(null);
    setBatchCreditRemaining(null);
  }, [batchExporting, batchGeneratingAll, batchUploading, generatingRowId]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col">
        <CommentModeTabs
          activeMode={activeMode}
          availableModes={commentModes}
          onModeChange={handleModeChange}
        />

        <div className="custom-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          {activeMode === 'single' ? (
            <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="sticky top-0">
                  <SingleCommentForm
                    disabled={loading}
                    error={formError}
                    onChange={handleFormChange}
                    onSubmit={generateComment}
                    values={formValues}
                  />
                </div>
              </div>

              <section className="flex flex-col gap-4 lg:col-span-7">
                {resultError ? (
                  <div
                    aria-live="assertive"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
                    role="alert"
                  >
                    {resultError}
                  </div>
                ) : null}

                {creditRemaining !== null ? (
                  <div className="self-end text-xs font-bold text-slate-400" aria-live="polite">
                    剩余点数：{creditRemaining}
                  </div>
                ) : null}

                <CommentResultList comments={comments} loading={loading} />
              </section>
            </div>
          ) : (
            <section className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              {batchRows.length === 0 ? (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <BatchImportGuide />
                  <ExcelUploadDropzone
                    disabled={
                      batchUploading ||
                      batchGeneratingAll ||
                      batchExporting ||
                      Boolean(generatingRowId)
                    }
                    error={batchError}
                    onFileAccepted={handleBatchUpload}
                    uploading={batchUploading}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col bg-white">
                  {batchError ? (
                    <div
                      aria-live="assertive"
                      className="m-6 mb-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
                      role="alert"
                    >
                      {batchError}
                    </div>
                  ) : null}

                  {batchCreditRemaining !== null ? (
                    <div
                      className="mx-6 mt-4 self-end text-xs font-bold text-slate-400"
                      aria-live="polite"
                    >
                      剩余点数：{batchCreditRemaining}
                    </div>
                  ) : null}

                  <BatchCommentToolbar
                    disabled={batchUploading || Boolean(generatingRowId)}
                    exporting={batchExporting}
                    generatingAll={batchGeneratingAll}
                    job={batchJob}
                    onExport={requestBatchExport}
                    onGenerateAll={generateAllBatchRows}
                    onReset={resetBatchUpload}
                    rows={batchRows}
                  />
                  <BatchCommentTable
                    disabled={batchUploading || batchExporting}
                    generatingAll={batchGeneratingAll}
                    generatingRowId={generatingRowId}
                    onGenerateRow={generateBatchRow}
                    rows={batchRows}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {exportAdOpen ? (
        <ExportAdModal isOpen onClose={closeExportAdGate} onConfirm={confirmExportAdGate} />
      ) : null}
      <GenerationAdOverlay isOpen={adOpen} mode={adMode} onClose={closeAdGate} />
    </div>
  );
}
