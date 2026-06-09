import { Injectable } from '@nestjs/common';
import { normalizeAdminAgentGradeClassification, WEB_AGENT_MAPPING } from '@package/shared';

import {
  AiAgentRuntimeError,
  generateTextWithAgentRuntime,
  streamTextWithAgentRuntime,
  type AiAgentModelCall,
} from '../ai/ai-agent-runtime.js';
import { CommentUploadXlsxError, parseCommentUploadXlsx } from './comment-upload-xlsx.js';
import {
  CommentsRepository,
  isGeneratableRowStatus,
  type CommentBatchCreateRowInput,
  type CommentBatchJobRow,
  type CommentBatchRowRecord,
} from './comments.repository.js';

const COMMENT_GENDERS = ['男', '女'] as const;
const COMMENT_GRADES = [
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '七年级',
  '八年级',
  '九年级',
  '小学',
  '初中',
  '高中',
] as const;
const COMMENT_TAGS = [
  '思维活跃',
  '基础扎实',
  '勇于探索',
  '逻辑严密',
  '表达流利',
  '需要辅导',
  '偶尔走神',
  '诚实守信',
  '遵守纪律',
  '责任心强',
  '低碳环保',
  '热心公益',
  '生活简朴',
  '独立自强',
  '乐于分享',
  '团结协作',
  '沟通顺畅',
  '富有同理心',
  '领导力强',
  '善于倾听',
  '活泼开朗',
  '认真',
  '乐于助人',
] as const;
const DEFAULT_COMMENT_TONE = '温和鼓励';

export type CommentGender = (typeof COMMENT_GENDERS)[number];

export type CommentSingleGenerateInput = {
  sessionId?: string;
  nickname?: string;
  gender: CommentGender;
  grade: string;
  subject?: string;
  tags: string[];
  keywords?: string;
  tone?: string;
};

export type CommentSingleGenerateResult = {
  sessionId: string;
  comments: string[];
  credit: {
    remaining: number;
  };
};

export type CommentUploadRowInput = {
  nickname?: string | null;
  gender: CommentGender;
  grade: string;
  tags: string[];
  keywords?: string | null;
};

export type CommentBatchCreateFromUploadInput = {
  fileName: string;
  fileSize: number;
  contentBase64?: string;
  mimeType?: string;
  tone?: string;
  rows?: CommentUploadRowInput[];
  previewRows?: CommentUploadRowInput[];
};

export type CommentBatchJob = {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  tone: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  estimatedCredits: number;
  createdAt: string;
  updatedAt: string;
};

export type CommentBatchRow = {
  id: string;
  jobId: string;
  rowIndex: number;
  nickname: string | null;
  gender: CommentGender;
  grade: string;
  tags: string[];
  keywords: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  comments: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentBatchCreateFromUploadResult = {
  job: CommentBatchJob;
  rowPreviews: CommentBatchRow[];
};

export type CommentBatchGenerateRowResult = {
  job: CommentBatchJob;
  row: CommentBatchRow;
  credit: {
    remaining: number;
  };
};

export type CommentBatchGenerateAllResult = {
  job: CommentBatchJob;
  rows: CommentBatchRow[];
  credit: {
    remaining: number;
  };
};

export type CommentBatchExportResult = {
  jobId: string;
  fileName: string;
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  contentBase64: string;
};

export type CommentSingleGenerateServiceInput = CommentSingleGenerateInput & {
  userId: string;
};

export type CommentSingleGenerateDeltaHandler = (content: string) => void | Promise<void>;

export type CommentBatchCreateFromUploadServiceInput = CommentBatchCreateFromUploadInput & {
  userId: string;
};

export type CommentBatchGenerateRowServiceInput = {
  userId: string;
  jobId: string;
  rowId: string;
};

export type CommentBatchGenerateAllServiceInput = {
  userId: string;
  jobId: string;
};

export type CommentBatchExportServiceInput = {
  userId: string;
  jobId: string;
};

export class CommentsServiceError extends Error {
  constructor(
    public readonly code: 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR',
    message: string
  ) {
    super(message);
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MOCK_REMAINING_CREDITS = 999;
const SUPPORTED_FILE_EXTENSIONS = ['.xlsx'] as const;

@Injectable()
export class CommentsService {
  constructor(private readonly commentsRepository: CommentsRepository) {}

  async generateSingle(
    input: CommentSingleGenerateServiceInput
  ): Promise<CommentSingleGenerateResult> {
    const normalized = normalizeSingleInput(input);
    const generated = await this.generateComments(normalized);

    return this.saveSingleGeneration(input.userId, normalized, generated);
  }

  async generateSingleStream(
    input: CommentSingleGenerateServiceInput,
    onDelta: CommentSingleGenerateDeltaHandler
  ): Promise<CommentSingleGenerateResult> {
    const normalized = normalizeSingleInput(input);
    const generated = await this.generateCommentsStream(normalized, onDelta);

    return this.saveSingleGeneration(input.userId, normalized, generated);
  }

  private async saveSingleGeneration(
    userId: string,
    normalized: NormalizedSingleInput,
    generated: {
      comments: string[];
      modelCall?: AiAgentModelCall;
    }
  ): Promise<CommentSingleGenerateResult> {
    const saved = await this.commentsRepository.saveSingleGeneration({
      userId,
      ...(normalized.sessionId === undefined ? {} : { sessionId: normalized.sessionId }),
      ...(normalized.nickname === null ? {} : { nickname: normalized.nickname }),
      gender: normalized.gender,
      grade: normalized.grade,
      ...(normalized.subject === null ? {} : { subject: normalized.subject }),
      tags: normalized.tags,
      ...(normalized.keywords === null ? {} : { keywords: normalized.keywords }),
      tone: normalized.tone,
      comments: generated.comments,
      ...(generated.modelCall === undefined ? {} : { modelCall: generated.modelCall }),
    });

    if (!saved) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment conversation not found');
    }

    return {
      sessionId: saved.sessionId,
      comments: generated.comments,
      credit: {
        remaining: MOCK_REMAINING_CREDITS,
      },
    };
  }

  async createFromUpload(
    input: CommentBatchCreateFromUploadServiceInput
  ): Promise<CommentBatchCreateFromUploadResult> {
    const fileName = requireTrimmedMax(input.fileName, 'Comment upload fileName', 255);
    ensureSupportedUploadName(fileName);
    const fileSize = normalizeFileSize(input.fileSize);
    const mimeType = trimOptionalMax(input.mimeType, 'Comment upload mimeType', 120);
    const tone = trimOptionalMax(input.tone, 'Comment tone', 40) ?? DEFAULT_COMMENT_TONE;
    const rows = normalizeUploadRows(resolveUploadRows(input));
    const { job, rows: createdRows } = await this.commentsRepository.createBatch({
      userId: input.userId,
      fileName,
      fileSize,
      ...(mimeType === undefined ? {} : { mimeType }),
      tone,
      rows,
    });

    return {
      job: toBatchJob(job),
      rowPreviews: createdRows.map(toBatchRow),
    };
  }

  async generateRow(
    input: CommentBatchGenerateRowServiceInput
  ): Promise<CommentBatchGenerateRowResult> {
    const jobId = requireTrimmed(input.jobId, 'Comment batch jobId is required');
    const rowId = requireTrimmed(input.rowId, 'Comment batch rowId is required');
    const batch = await this.commentsRepository.findBatchForUser(input.userId, jobId);

    if (!batch) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment batch job not found');
    }

    const row = batch.rows.find((item) => item.id === rowId);

    if (!row) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment batch row not found');
    }

    if (!isGeneratableRowStatus(row.status)) {
      return {
        job: toBatchJob(batch.job),
        row: toBatchRow(row),
        credit: { remaining: MOCK_REMAINING_CREDITS },
      };
    }

    const generated = await this.generateComments({
      nickname: row.nickname,
      gender: row.gender,
      grade: row.grade,
      subject: null,
      tags: row.tags,
      keywords: row.keywords,
      tone: batch.job.tone,
    });
    const updated = await this.commentsRepository.updateRowGenerated({
      userId: input.userId,
      jobId,
      rowId,
      generatedResults: generated.comments,
      ...(generated.modelCall === undefined ? {} : { modelCall: generated.modelCall }),
    });

    if (!updated) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment batch row not found');
    }

    return {
      job: toBatchJob(updated.job),
      row: toBatchRow(updated.row),
      credit: { remaining: MOCK_REMAINING_CREDITS },
    };
  }

  async generateAll(
    input: CommentBatchGenerateAllServiceInput
  ): Promise<CommentBatchGenerateAllResult> {
    const jobId = requireTrimmed(input.jobId, 'Comment batch jobId is required');
    const batch = await this.commentsRepository.findBatchForUser(input.userId, jobId);

    if (!batch) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment batch job not found');
    }

    let currentJob = batch.job;
    const rowsById = new Map(batch.rows.map((row) => [row.id, row]));

    for (const row of batch.rows) {
      if (!isGeneratableRowStatus(row.status)) {
        continue;
      }

      const generated = await this.generateComments({
        nickname: row.nickname,
        gender: row.gender,
        grade: row.grade,
        subject: null,
        tags: row.tags,
        keywords: row.keywords,
        tone: batch.job.tone,
      });
      const updated = await this.commentsRepository.updateRowGenerated({
        userId: input.userId,
        jobId,
        rowId: row.id,
        generatedResults: generated.comments,
        ...(generated.modelCall === undefined ? {} : { modelCall: generated.modelCall }),
      });

      if (updated) {
        currentJob = updated.job;
        rowsById.set(updated.row.id, updated.row);
      }
    }

    const rows = [...rowsById.values()].sort((left, right) => left.rowIndex - right.rowIndex);

    return {
      job: toBatchJob(currentJob),
      rows: rows.map(toBatchRow),
      credit: { remaining: MOCK_REMAINING_CREDITS },
    };
  }

  async exportBatch(input: CommentBatchExportServiceInput): Promise<CommentBatchExportResult> {
    const jobId = requireTrimmed(input.jobId, 'Comment batch jobId is required');
    const batch = await this.commentsRepository.findBatchForUser(input.userId, jobId);

    if (!batch) {
      throw new CommentsServiceError('NOT_FOUND', 'Comment batch job not found');
    }

    const rows = batch.rows.filter((row) => row.status === 'success');

    if (rows.length === 0) {
      throw new CommentsServiceError('CONFLICT', 'Comment batch has no generated rows');
    }

    return {
      jobId,
      fileName: `红笔AI_批量评语生成结果_${formatDate(new Date())}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBase64: createXlsxBase64(rows),
    };
  }

  private async generateComments(input: NormalizedSingleInput): Promise<{
    comments: string[];
    modelCall?: AiAgentModelCall;
  }> {
    const agentKey = WEB_AGENT_MAPPING.comment.adminAgentKey;
    const runtimeConfig = await this.commentsRepository.findAgentRuntimeConfigByKey(agentKey, {
      grade: normalizeAdminAgentGradeClassification(agentKey, input.grade),
      subject: null,
    });

    if (!runtimeConfig) {
      return {
        comments: createMockComments(input),
      };
    }

    try {
      const generated = await generateTextWithAgentRuntime(runtimeConfig, {
        message: createCommentModelMessage(input),
      });

      return {
        comments: parseGeneratedComments(generated.content),
        modelCall: generated.modelCall,
      };
    } catch (error) {
      if (error instanceof AiAgentRuntimeError) {
        if (error.code === 'SENSITIVE_WORD_MATCH') {
          throw new CommentsServiceError('BAD_REQUEST', error.message);
        }

        throw new CommentsServiceError('INTERNAL_SERVER_ERROR', error.message);
      }

      throw error;
    }
  }

  private async generateCommentsStream(
    input: NormalizedSingleInput,
    onDelta: CommentSingleGenerateDeltaHandler
  ): Promise<{
    comments: string[];
    modelCall?: AiAgentModelCall;
  }> {
    const agentKey = WEB_AGENT_MAPPING.comment.adminAgentKey;
    const runtimeConfig = await this.commentsRepository.findAgentRuntimeConfigByKey(agentKey, {
      grade: normalizeAdminAgentGradeClassification(agentKey, input.grade),
      subject: null,
    });

    if (!runtimeConfig) {
      const comments = createMockComments(input);

      await emitMockCommentDeltas(comments.join('\n'), onDelta);

      return { comments };
    }

    try {
      const generated = await streamTextWithAgentRuntime(
        runtimeConfig,
        {
          message: createCommentModelMessage(input),
        },
        onDelta
      );

      return {
        comments: parseGeneratedComments(generated.content),
        modelCall: generated.modelCall,
      };
    } catch (error) {
      if (error instanceof AiAgentRuntimeError) {
        if (error.code === 'SENSITIVE_WORD_MATCH') {
          throw new CommentsServiceError('BAD_REQUEST', error.message);
        }

        throw new CommentsServiceError('INTERNAL_SERVER_ERROR', error.message);
      }

      throw error;
    }
  }
}

function resolveUploadRows(input: CommentBatchCreateFromUploadInput): CommentUploadRowInput[] {
  if (input.rows) {
    return input.rows;
  }

  if (input.previewRows) {
    return input.previewRows;
  }

  const contentBase64 = trimOptionalMax(
    input.contentBase64,
    'Comment upload contentBase64',
    15_000_000
  );

  if (!contentBase64) {
    return createMockUploadRows();
  }

  try {
    return parseCommentUploadXlsx(contentBase64);
  } catch (error) {
    if (error instanceof CommentUploadXlsxError) {
      throw new CommentsServiceError('BAD_REQUEST', error.message);
    }

    throw error;
  }
}

type NormalizedSingleInput = {
  sessionId?: string;
  nickname: string | null;
  gender: CommentGender;
  grade: string;
  subject: string | null;
  tags: string[];
  keywords: string | null;
  tone: string;
};

function normalizeSingleInput(input: CommentSingleGenerateInput): NormalizedSingleInput {
  const sessionId = trimOptionalMax(input.sessionId, 'Comment sessionId', 100);

  return {
    ...(sessionId === undefined ? {} : { sessionId }),
    nickname: trimOptionalMax(input.nickname, 'Comment nickname', 100) ?? null,
    gender: normalizeGender(input.gender),
    grade: normalizeGrade(input.grade),
    subject: trimOptionalMax(input.subject, 'Comment subject', 50) ?? null,
    tags: normalizeTags(input.tags),
    keywords: trimOptionalMax(input.keywords, 'Comment keywords', 1000) ?? null,
    tone: trimOptionalMax(input.tone, 'Comment tone', 40) ?? DEFAULT_COMMENT_TONE,
  };
}

function normalizeUploadRows(rows: CommentUploadRowInput[]): CommentBatchCreateRowInput[] {
  if (rows.length === 0) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment upload requires at least one row');
  }

  return rows.map((row, index) => ({
    rowIndex: index + 1,
    nickname: trimOptionalMax(row.nickname ?? undefined, 'Comment row nickname', 100) ?? null,
    gender: normalizeGender(row.gender),
    grade: normalizeGrade(row.grade),
    tags: normalizeUploadTags(row.tags),
    keywords: trimOptionalMax(row.keywords ?? undefined, 'Comment row keywords', 1000) ?? null,
  }));
}

function normalizeGender(value: string): CommentGender {
  if (!COMMENT_GENDERS.includes(value as CommentGender)) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment gender must be 男 or 女');
  }

  return value as CommentGender;
}

function normalizeGrade(value: string): string {
  const grade = requireTrimmedMax(value, 'Comment grade', 20, 'Comment grade is required');

  if (!COMMENT_GRADES.includes(grade as (typeof COMMENT_GRADES)[number])) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment grade is unsupported');
  }

  return grade;
}

function normalizeTags(value: string[]): string[] {
  if (!Array.isArray(value)) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment tags must be an array');
  }

  const tags = [...new Set(value.map((tag) => tag.trim()).filter(Boolean))];

  if (tags.some((tag) => !COMMENT_TAGS.includes(tag as (typeof COMMENT_TAGS)[number]))) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment tags contain unsupported values');
  }

  return tags;
}

function normalizeUploadTags(value: string[]): string[] {
  if (!Array.isArray(value)) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment tags must be an array');
  }

  return [
    ...new Set(
      value
        .map((tag) => trimOptionalMax(tag, 'Comment row tag', 40))
        .filter((tag): tag is string => tag !== undefined)
    ),
  ];
}

function normalizeFileSize(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new CommentsServiceError(
      'BAD_REQUEST',
      'Comment upload fileSize must be a positive integer'
    );
  }

  if (value > MAX_FILE_SIZE) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment upload file is too large');
  }

  return value;
}

function ensureSupportedUploadName(fileName: string): void {
  const normalized = fileName.toLowerCase();

  if (!SUPPORTED_FILE_EXTENSIONS.some((extension) => normalized.endsWith(extension))) {
    throw new CommentsServiceError('BAD_REQUEST', 'Comment upload file must be .xlsx');
  }
}

function createMockUploadRows(): CommentUploadRowInput[] {
  return [
    {
      nickname: '小林',
      gender: '男',
      grade: '三年级',
      tags: ['思维活跃', '乐于分享'],
      keywords: '课堂发言更主动，数学进步明显',
    },
    {
      nickname: '小雨',
      gender: '女',
      grade: '四年级',
      tags: ['基础扎实', '善于倾听'],
      keywords: '作业稳定认真，表达可以更大胆',
    },
    {
      nickname: '小航',
      gender: '男',
      grade: '五年级',
      tags: ['责任心强', '团结协作'],
      keywords: '小组合作积极，书写需要继续保持',
    },
  ];
}

function createCommentModelMessage(input: NormalizedSingleInput): string {
  const name = input.nickname ?? '这位同学';
  const tags = input.tags.length > 0 ? input.tags.join('、') : '未填写标签';
  const subject = input.subject ? `学科：${input.subject}。` : '';
  const keywords = input.keywords ? `关注点：${input.keywords}。` : '';

  return `请为${name}生成3条${input.grade}学生评语。${subject}性别：${input.gender}。语气：${input.tone}。表现标签：${tags}。${keywords}请每条单独成行。`;
}

function parseGeneratedComments(content: string): string[] {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const comments = lines.some((line) => isCommentHeading(stripCommentLineMarker(line)))
    ? groupHeadingComments(lines)
    : lines.map(stripCommentLineMarker).filter(Boolean);

  return comments.length > 0 ? comments : [content];
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

function createMockComments(input: NormalizedSingleInput): string[] {
  const name = input.nickname ?? '这位同学';
  const tagSummary = input.tags.length > 0 ? input.tags.join('、') : '持续成长';
  const detail = input.keywords ? `结合${input.keywords}，` : '';

  return [
    `${name}在${input.grade}阶段表现出${tagSummary}的特点。${detail}希望继续保持学习热情。`,
    `${name}课堂状态稳步提升，能够在${input.tone}的氛围中展现自己的优势。`,
    `${name}本学期进步清晰可见，后续可以围绕目标坚持练习，争取更稳定的发展。`,
  ];
}

async function emitMockCommentDeltas(
  content: string,
  onDelta: CommentSingleGenerateDeltaHandler
): Promise<void> {
  const chunkSize = 4;

  for (let index = 0; index < content.length; index += chunkSize) {
    await onDelta(content.slice(index, index + chunkSize));
  }
}

function toBatchJob(row: CommentBatchJobRow): CommentBatchJob {
  return {
    id: row.id,
    status: row.status,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    tone: row.tone,
    totalRows: row.totalRows,
    successRows: row.successRows,
    failedRows: row.failedRows,
    estimatedCredits: Math.max(row.totalRows - row.successRows, 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBatchRow(row: CommentBatchRowRecord): CommentBatchRow {
  return {
    id: row.id,
    jobId: row.jobId,
    rowIndex: row.rowIndex,
    nickname: row.nickname,
    gender: row.gender,
    grade: row.grade,
    tags: row.tags,
    keywords: row.keywords,
    status: row.status,
    comments: row.generatedResults ?? [],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createXlsxBase64(rows: CommentBatchRowRecord[]): string {
  const header = [
    '行号',
    '昵称',
    '性别',
    '年级',
    '表现标签',
    '核心优缺点',
    '评语1',
    '评语2',
    '评语3',
  ];
  const values = rows.map((row) => {
    const comments = normalizeExportComments(row.generatedResults ?? []);

    return [
      row.rowIndex.toString(),
      row.nickname ?? '',
      row.gender,
      row.grade,
      row.tags.join('、'),
      row.keywords ?? '',
      comments[0] ?? '',
      comments[1] ?? '',
      comments[2] ?? '',
    ];
  });

  return createZipBase64([
    {
      path: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      path: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      path: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="评语结果" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>',
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    },
    {
      path: 'xl/worksheets/sheet1.xml',
      content: createWorksheetXml([header, ...values]),
    },
  ]);
}

function normalizeExportComments(comments: string[]): string[] {
  return comments.slice(0, 3).map(stripMarkdownForExport);
}

function stripMarkdownForExport(value: string): string {
  return value
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)、]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function createWorksheetXml(rows: string[][]): string {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map(
          (value, columnIndex) =>
            `<c r="${getCellRef(columnIndex, rowNumber)}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
        )
        .join('');

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${sheetRows}</sheetData>` +
    '</worksheet>'
  );
}

function getCellRef(columnIndex: number, rowNumber: number): string {
  let column = '';
  let current = columnIndex + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return `${column}${rowNumber}`;
}

type ZipEntry = {
  path: string;
  content: string;
};

function createZipBase64(entries: ZipEntry[]): string {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, 'utf8');
    const content = Buffer.from(entry.content, 'utf8');
    const checksum = crc32(content);
    const localHeader = createLocalFileHeader(fileName, content, checksum);
    const centralHeader = createCentralDirectoryHeader(fileName, content, checksum, offset);
    const localPart = Buffer.concat([localHeader, fileName, content]);

    localParts.push(localPart);
    centralParts.push(Buffer.concat([centralHeader, fileName]));
    offset += localPart.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = createEndOfCentralDirectory(entries.length, centralDirectory.length, offset);

  return Buffer.concat([...localParts, centralDirectory, endRecord]).toString('base64');
}

function createLocalFileHeader(fileName: Buffer, content: Buffer, checksum: number): Buffer {
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);

  return header;
}

function createCentralDirectoryHeader(
  fileName: Buffer,
  content: Buffer,
  checksum: number,
  offset: number
): Buffer {
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(content.length, 20);
  header.writeUInt32LE(content.length, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);

  return header;
}

function createEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number
): Buffer {
  const record = Buffer.alloc(22);

  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralDirectorySize, 12);
  record.writeUInt32LE(centralDirectoryOffset, 16);
  record.writeUInt16LE(0, 20);

  return record;
}

function crc32(content: Buffer): number {
  let checksum = 0xffffffff;

  for (const byte of content) {
    checksum = (CRC32_TABLE[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let checksum = index;

  for (let bit = 0; bit < 8; bit += 1) {
    checksum = checksum & 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
  }

  return checksum >>> 0;
});

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new CommentsServiceError('BAD_REQUEST', message);
  }

  return trimmed;
}

function requireTrimmedMax(
  value: string,
  field: string,
  maxLength: number,
  message?: string
): string {
  const trimmed = requireTrimmed(value, message ?? `${field} is required`);

  if (trimmed.length > maxLength) {
    throw new CommentsServiceError(
      'BAD_REQUEST',
      `${field} must be ${maxLength} characters or fewer`
    );
  }

  return trimmed;
}

function trimOptionalMax(
  value: string | null | undefined,
  field: string,
  maxLength: number
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new CommentsServiceError(
      'BAD_REQUEST',
      `${field} must be ${maxLength} characters or fewer`
    );
  }

  return trimmed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
