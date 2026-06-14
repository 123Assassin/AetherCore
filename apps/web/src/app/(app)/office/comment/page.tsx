'use client';

import type {
  CommentBatchJob,
  CommentBatchRow,
  CommentGrade,
  CommentSingleGenerateInput,
} from '@package/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { deriveBatchCommentSimilarityWarnings } from '../../../../components/comments/batch-comment-similarity';
import { BatchCommentTable } from '../../../../components/comments/batch-comment-table';
import { BatchCommentToolbar } from '../../../../components/comments/batch-comment-toolbar';
import { BatchImportGuide } from '../../../../components/comments/batch-import-guide';
import { CommentModeTabs } from '../../../../components/comments/comment-mode-tabs';
import { CommentResultList } from '../../../../components/comments/comment-result-list';
import {
  commentGradeOptions,
  defaultCommentTone,
} from '../../../../components/comments/comment-tags.data';
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
  grade: '一年级',
  tags: [],
  keywords: '',
  tone: defaultCommentTone,
};

const commentModes = [
  { label: '单人评语精编', mode: 'single' as const },
  { label: '批量表格导入', mode: 'batch' as const },
];
const similarityDemoJobId = 'similarity-demo-job';
const demoRegenerationLimit = 5;
const streamPreviewIntervalMs = 24;
const streamPreviewChunkSize = 3;

function getMutationErrorMessage() {
  return '评语生成失败，请稍后重试。';
}

function getBatchErrorMessage(fallback: string) {
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

function updateBatchRowComment(rows: CommentBatchRow[], rowId: string, comment: string) {
  return rows.map((row) =>
    row.id === rowId ? { ...row, comments: [comment], errorMessage: null } : row
  );
}

function createSimilarityDemoRows(grade: CommentGrade): CommentBatchRow[] {
  const now = new Date().toISOString();
  const sharedComment =
    '小林近期课堂状态稳定，能认真倾听老师讲解，积极完成学习任务。希望继续保持主动表达的习惯，在后续学习中取得更扎实的进步。';

  return [
    {
      comments: [sharedComment],
      createdAt: now,
      errorMessage: null,
      gender: '男',
      grade,
      id: 'similarity-demo-row-1',
      jobId: similarityDemoJobId,
      keywords: '课堂状态稳定，主动表达',
      nickname: '小林',
      rowIndex: 1,
      status: 'success',
      tags: ['认真', '思维活跃'],
      updatedAt: now,
    },
    {
      comments: [sharedComment.replace('小林', '小雨')],
      createdAt: now,
      errorMessage: null,
      gender: '女',
      grade,
      id: 'similarity-demo-row-2',
      jobId: similarityDemoJobId,
      keywords: '课堂状态稳定，学习任务完成度高',
      nickname: '小雨',
      rowIndex: 2,
      status: 'success',
      tags: ['认真', '基础扎实'],
      updatedAt: now,
    },
  ];
}

function isSimilarityDemoRow(row: CommentBatchRow) {
  return row.jobId === similarityDemoJobId;
}

function addSetItem(values: Set<string>, item: string) {
  const nextValues = new Set(values);

  nextValues.add(item);

  return nextValues;
}

function deleteSetItems(values: Set<string>, items: Iterable<string>) {
  const nextValues = new Set(values);

  for (const item of items) {
    nextValues.delete(item);
  }

  return nextValues;
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
  const [defaultBatchGrade, setDefaultBatchGrade] = useState<CommentGrade>('一年级');
  const [dirtyBatchRowIds, setDirtyBatchRowIds] = useState<Set<string>>(() => new Set());
  const [savingBatchRowIds, setSavingBatchRowIds] = useState<Set<string>>(() => new Set());
  const [demoRegenerationCount, setDemoRegenerationCount] = useState(0);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchTemplateDownloading, setBatchTemplateDownloading] = useState(false);
  const [batchGeneratingAll, setBatchGeneratingAll] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [generatingRowId, setGeneratingRowId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchCreditRemaining, setBatchCreditRemaining] = useState<number | null>(null);
  const [exportAdOpen, setExportAdOpen] = useState(false);
  const batchSimilarityWarnings = useMemo(
    () => deriveBatchCommentSimilarityWarnings(batchRows, 0.85),
    [batchRows]
  );

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
        setDirtyBatchRowIds(new Set());
        setSavingBatchRowIds(new Set());
        setDemoRegenerationCount(0);
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
      setDirtyBatchRowIds(new Set());
      setSavingBatchRowIds(new Set());
      setDemoRegenerationCount(0);
      setBatchError(null);
      setBatchCreditRemaining(null);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeHistorySession?.state, currentHistorySessionId]);

  const handleFormChange = useCallback(
    (nextValues: SingleCommentFormValues) => {
      setFormValues(nextValues);

      if (formError && nextValues.gender && nextValues.grade) {
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
        setFormError('请选择性别和年级。');
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
        } catch {
          previewWriter.stop();
          setComments([]);
          setResultError(getMutationErrorMessage());
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
          defaultGrade: defaultBatchGrade,
          fileName: file.name,
          fileSize: file.size,
          ...(file.type ? { mimeType: file.type } : {}),
        });

        if (batchUploadRequestRef.current === requestId) {
          setBatchJob(result.job);
          setBatchRows(result.rowPreviews);
          setDirtyBatchRowIds(new Set());
          setSavingBatchRowIds(new Set());
          setDemoRegenerationCount(0);
        }
      } catch {
        if (batchUploadRequestRef.current === requestId) {
          setBatchError(getBatchErrorMessage('批量队列创建失败，请稍后重试。'));
        }
      } finally {
        if (batchUploadRequestRef.current === requestId) {
          setBatchUploading(false);
        }
      }
    },
    [batchExporting, batchGeneratingAll, batchUploading, client, defaultBatchGrade, generatingRowId]
  );

  const downloadBatchTemplate = useCallback(async () => {
    if (batchTemplateDownloading) {
      return;
    }

    setBatchTemplateDownloading(true);
    setBatchError(null);

    try {
      const result = await client.comments.batch.template.query();

      downloadBase64File(result.contentBase64, result.mimeType, result.fileName);
    } catch {
      setBatchError(getBatchErrorMessage('模板下载失败，请重试。'));
    } finally {
      setBatchTemplateDownloading(false);
    }
  }, [batchTemplateDownloading, client]);

  const injectSimilarityDemoData = useCallback(() => {
    if (batchUploading || batchGeneratingAll || batchExporting || generatingRowId) {
      return;
    }

    setBatchJob(null);
    setBatchRows(createSimilarityDemoRows(defaultBatchGrade));
    setDirtyBatchRowIds(new Set());
    setSavingBatchRowIds(new Set());
    setDemoRegenerationCount(0);
    setBatchError(null);
    setBatchCreditRemaining(null);
  }, [batchExporting, batchGeneratingAll, batchUploading, defaultBatchGrade, generatingRowId]);

  const generateDemoBatchRow = useCallback(
    (row: CommentBatchRow) => {
      if (!isSimilarityDemoRow(row) || batchGeneratingAll || generatingRowId) {
        return;
      }

      if (demoRegenerationCount >= demoRegenerationLimit) {
        setBatchError('体验换一个次数已用完，请上传表格后继续生成。');
        return;
      }

      runWithAdGate(async () => {
        setGeneratingRowId(row.id);
        setDemoRegenerationCount((currentCount) => currentCount + 1);
        setBatchError(null);
        setBatchRows((currentRows) =>
          currentRows.map((currentRow) =>
            currentRow.id === row.id
              ? { ...currentRow, errorMessage: null, status: 'generating' as const }
              : currentRow
          )
        );

        try {
          const result = await client.comments.batch.generateDemoRow.mutate({
            gender: row.gender,
            grade: row.grade,
            tags: row.tags,
            ...(row.nickname ? { nickname: row.nickname } : {}),
            ...(row.keywords ? { keywords: row.keywords } : {}),
          });

          setBatchRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.id === row.id
                ? {
                    ...currentRow,
                    comments: [result.comment],
                    errorMessage: null,
                    status: 'success' as const,
                    updatedAt: new Date().toISOString(),
                  }
                : currentRow
            )
          );
          setDirtyBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
          setSavingBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
        } catch {
          const message = getBatchErrorMessage('体验评语生成失败，请重试。');

          setBatchError(message);
          setBatchRows((currentRows) => setRowsFailed(currentRows, new Set([row.id]), message));
        } finally {
          setGeneratingRowId(null);
        }
      });
    },
    [batchGeneratingAll, client, demoRegenerationCount, generatingRowId, runWithAdGate]
  );

  const generateBatchRow = useCallback(
    (row: CommentBatchRow) => {
      if (isSimilarityDemoRow(row)) {
        generateDemoBatchRow(row);
        return;
      }

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
          setDirtyBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
          setSavingBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
          setBatchCreditRemaining(result.credit.remaining);
        } catch {
          const message = getBatchErrorMessage('该行评语生成失败，请重试。');

          setBatchError(message);
          setBatchRows((currentRows) => setRowsFailed(currentRows, new Set([row.id]), message));
        } finally {
          setGeneratingRowId(null);
        }
      });
    },
    [batchGeneratingAll, batchJob, client, generateDemoBatchRow, generatingRowId, runWithAdGate]
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
            setDirtyBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
            setSavingBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
            setBatchCreditRemaining(result.credit.remaining);
          } catch {
            failedRows += 1;

            const message = getBatchErrorMessage('该行评语生成失败，请重试。');

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

  const handleBatchCommentChange = useCallback((row: CommentBatchRow, comment: string) => {
    if (row.status !== 'success') {
      return;
    }

    setBatchRows((currentRows) => updateBatchRowComment(currentRows, row.id, comment));
    setDirtyBatchRowIds((currentIds) => addSetItem(currentIds, row.id));
    setBatchError(null);
  }, []);

  const saveDirtyBatchComments = useCallback(
    async (targetRowIds = dirtyBatchRowIds) => {
      if (!batchJob || targetRowIds.size === 0) {
        return true;
      }

      const rowsToSave = batchRows.filter((row) => targetRowIds.has(row.id));

      if (rowsToSave.length === 0) {
        setDirtyBatchRowIds((currentIds) => deleteSetItems(currentIds, targetRowIds));
        return true;
      }

      setSavingBatchRowIds((currentIds) => {
        const nextIds = new Set(currentIds);

        for (const row of rowsToSave) {
          nextIds.add(row.id);
        }

        return nextIds;
      });

      try {
        for (const row of rowsToSave) {
          const comment = (row.comments[0] ?? '').trim();

          if (!comment) {
            setBatchError(`第 ${row.rowIndex} 行评语不能为空。`);
            return false;
          }

          const result = await client.comments.batch.updateRowComment.mutate({
            comment,
            jobId: batchJob.id,
            rowId: row.id,
          });

          setBatchJob(result.job);
          setBatchRows((currentRows) => replaceBatchRow(currentRows, result.row));
          setDirtyBatchRowIds((currentIds) => deleteSetItems(currentIds, [row.id]));
        }

        return true;
      } catch {
        setBatchError(getBatchErrorMessage('编辑后的评语保存失败，请重试。'));
        return false;
      } finally {
        setSavingBatchRowIds((currentIds) =>
          deleteSetItems(
            currentIds,
            rowsToSave.map((row) => row.id)
          )
        );
      }
    },
    [batchJob, batchRows, client, dirtyBatchRowIds]
  );

  const handleBatchCommentBlur = useCallback(
    (row: CommentBatchRow) => {
      if (!dirtyBatchRowIds.has(row.id)) {
        return;
      }

      void saveDirtyBatchComments(new Set([row.id]));
    },
    [dirtyBatchRowIds, saveDirtyBatchComments]
  );

  const exportBatchRows = useCallback(async () => {
    const hasSuccessRow = batchRows.some((row) => row.status === 'success');

    if (!batchJob || !hasSuccessRow || batchExporting) {
      return;
    }

    setBatchExporting(true);
    setBatchError(null);

    try {
      const saved = await saveDirtyBatchComments();

      if (!saved) {
        return;
      }

      const result = await client.comments.batch.export.query({ jobId: batchJob.id });

      downloadBase64File(result.contentBase64, result.mimeType, result.fileName);
    } catch {
      setBatchError(getBatchErrorMessage('批量评语导出失败，请重试。'));
    } finally {
      setBatchExporting(false);
    }
  }, [batchExporting, batchJob, batchRows, client, saveDirtyBatchComments]);

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
    setDirtyBatchRowIds(new Set());
    setSavingBatchRowIds(new Set());
    setDemoRegenerationCount(0);
    setBatchError(null);
    setBatchCreditRemaining(null);
  }, [batchExporting, batchGeneratingAll, batchUploading, generatingRowId]);

  const canGenerateBatchTableRow = useCallback(
    (row: CommentBatchRow) => {
      if (isSimilarityDemoRow(row)) {
        return demoRegenerationCount < demoRegenerationLimit;
      }

      return Boolean(batchJob);
    },
    [batchJob, demoRegenerationCount]
  );

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
            <section className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {batchRows.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col bg-slate-50/30">
                  <section className="border-b border-slate-100 bg-white p-8">
                    <div className="mx-auto max-w-6xl">
                      <div className="mb-6 flex items-start gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">
                          1
                        </span>
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-slate-800">
                            设置本批次基础信息
                          </h3>
                          <p className="mt-1 text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                            系统将为您导入的所有学生自动应用以下年级
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 lg:flex-row lg:items-stretch">
                        <label className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          <span className="text-xs font-black tracking-[0.18em] text-slate-400 uppercase">
                            默认年级
                          </span>
                          <select
                            aria-label="批次默认年级"
                            className="mt-3 w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition-all outline-none hover:bg-white focus:ring-2 focus:ring-emerald-500"
                            disabled={
                              batchUploading ||
                              batchGeneratingAll ||
                              batchExporting ||
                              Boolean(generatingRowId)
                            }
                            onChange={(event) => {
                              const target = event.currentTarget as unknown as {
                                value: CommentGrade;
                              };

                              setDefaultBatchGrade(target.value);
                            }}
                            value={defaultBatchGrade}
                          >
                            {commentGradeOptions.map((grade) => (
                              <option key={grade} value={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5">
                          <p className="text-sm leading-7 font-bold text-emerald-800">
                            无需在表格中输入年级。系统识别后会统一补充为此处设置的值。
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <BatchImportGuide
                      disabled={
                        batchUploading ||
                        batchGeneratingAll ||
                        batchExporting ||
                        batchTemplateDownloading ||
                        Boolean(generatingRowId)
                      }
                      downloadingTemplate={batchTemplateDownloading}
                      onDownloadTemplate={downloadBatchTemplate}
                      onInjectDemoData={injectSimilarityDemoData}
                    />
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
                    canGenerateRow={canGenerateBatchTableRow}
                    disabled={batchUploading || batchExporting}
                    generatingAll={batchGeneratingAll}
                    generatingRowId={generatingRowId}
                    onCommentBlur={handleBatchCommentBlur}
                    onCommentChange={handleBatchCommentChange}
                    onGenerateRow={generateBatchRow}
                    rows={batchRows}
                    savingRowIds={savingBatchRowIds}
                    similarityWarnings={batchSimilarityWarnings}
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
