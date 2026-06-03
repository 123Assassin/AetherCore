import { TRPCError } from '@trpc/server';

import {
  requireAiUserSession,
  requireUserSession,
} from '../../common/guards/user-session.guard.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import {
  CommentsServiceError,
  type CommentsService,
  type CommentBatchCreateFromUploadInput,
  type CommentBatchGenerateAllServiceInput,
  type CommentBatchGenerateRowServiceInput,
  type CommentBatchExportServiceInput,
  type CommentSingleGenerateInput,
  type CommentUploadRowInput,
} from '../../modules/comments/comments.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

export function createCommentsRouter(
  authService: AuthService,
  commentsService: CommentsService,
  tools: RouterTools
) {
  return tools.createTRPCRouter({
    single: tools.createTRPCRouter({
      generate: tools.publicProcedure
        .input(parseSingleGenerateInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireAiUserSession(authService, ctx);

          return mapServiceError(() =>
            commentsService.generateSingle({
              userId: session.user.id,
              ...input,
            })
          );
        }),
    }),
    batch: tools.createTRPCRouter({
      createFromUpload: tools.publicProcedure
        .input(parseCreateFromUploadInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            commentsService.createFromUpload({
              userId: session.user.id,
              ...input,
            })
          );
        }),
      generateRow: tools.publicProcedure
        .input(parseGenerateRowInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireAiUserSession(authService, ctx);

          return mapServiceError(() =>
            commentsService.generateRow({
              userId: session.user.id,
              ...input,
            })
          );
        }),
      generateAll: tools.publicProcedure
        .input(parseGenerateAllInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireAiUserSession(authService, ctx);

          return mapServiceError(() =>
            commentsService.generateAll({
              userId: session.user.id,
              ...input,
            })
          );
        }),
      export: tools.publicProcedure.input(parseExportInput).query(async ({ ctx, input }) => {
        const session = await requireUserSession(authService, ctx);

        return mapServiceError(() =>
          commentsService.exportBatch({
            userId: session.user.id,
            ...input,
          })
        );
      }),
    }),
  });
}

function parseSingleGenerateInput(input: unknown): CommentSingleGenerateInput {
  if (!isRecord(input)) {
    throwInvalidInput('Comment single generate input must be an object');
  }

  const sessionId = parseOptionalString(input.sessionId, 'sessionId');
  const nickname = parseOptionalString(input.nickname, 'nickname');
  const subject = parseOptionalString(input.subject, 'subject');
  const keywords = parseOptionalString(input.keywords, 'keywords');
  const tone = parseOptionalString(input.tone, 'tone');

  return {
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(nickname === undefined ? {} : { nickname }),
    gender: parseRequiredString(input.gender, 'Comment gender is required') as '男' | '女',
    grade: parseRequiredString(input.grade, 'Comment grade is required'),
    ...(subject === undefined ? {} : { subject }),
    tags: parseRequiredStringArray(input.tags, 'Comment tags must be an array'),
    ...(keywords === undefined ? {} : { keywords }),
    ...(tone === undefined ? {} : { tone }),
  };
}

function parseCreateFromUploadInput(input: unknown): CommentBatchCreateFromUploadInput {
  if (!isRecord(input)) {
    throwInvalidInput('Comment batch createFromUpload input must be an object');
  }

  const mimeType = parseOptionalString(input.mimeType, 'mimeType');
  const tone = parseOptionalString(input.tone, 'tone');
  const contentBase64 = parseOptionalString(input.contentBase64, 'contentBase64');
  const rows = parseOptionalUploadRows(input.rows, 'rows');
  const previewRows = parseOptionalUploadRows(input.previewRows, 'previewRows');

  return {
    fileName: parseRequiredString(input.fileName, 'Comment upload fileName is required'),
    fileSize: parseRequiredNumber(input.fileSize, 'Comment upload fileSize is required'),
    ...(contentBase64 === undefined ? {} : { contentBase64 }),
    ...(mimeType === undefined ? {} : { mimeType }),
    ...(tone === undefined ? {} : { tone }),
    ...(rows === undefined ? {} : { rows }),
    ...(previewRows === undefined ? {} : { previewRows }),
  };
}

function parseGenerateRowInput(
  input: unknown
): Omit<CommentBatchGenerateRowServiceInput, 'userId'> {
  if (!isRecord(input)) {
    throwInvalidInput('Comment batch generateRow input must be an object');
  }

  return {
    jobId: parseRequiredString(input.jobId, 'Comment batch jobId is required'),
    rowId: parseRequiredString(input.rowId, 'Comment batch rowId is required'),
  };
}

function parseGenerateAllInput(
  input: unknown
): Omit<CommentBatchGenerateAllServiceInput, 'userId'> {
  if (!isRecord(input)) {
    throwInvalidInput('Comment batch generateAll input must be an object');
  }

  return {
    jobId: parseRequiredString(input.jobId, 'Comment batch jobId is required'),
  };
}

function parseExportInput(input: unknown): Omit<CommentBatchExportServiceInput, 'userId'> {
  if (!isRecord(input)) {
    throwInvalidInput('Comment batch export input must be an object');
  }

  return {
    jobId: parseRequiredString(input.jobId, 'Comment batch jobId is required'),
  };
}

function parseOptionalUploadRows(
  value: unknown,
  field: string
): CommentUploadRowInput[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throwInvalidInput(`Comment ${field} must be an array`);
  }

  return value.map((row, index) => parseUploadRow(row, `${field}[${index}]`));
}

function parseUploadRow(value: unknown, field: string): CommentUploadRowInput {
  if (!isRecord(value)) {
    throwInvalidInput(`Comment ${field} must be an object`);
  }

  const nickname = parseOptionalNullableString(value.nickname, `${field}.nickname`);
  const keywords = parseOptionalNullableString(value.keywords, `${field}.keywords`);

  return {
    ...(nickname === undefined ? {} : { nickname }),
    gender: parseRequiredString(value.gender, `Comment ${field}.gender is required`) as '男' | '女',
    grade: parseRequiredString(value.grade, `Comment ${field}.grade is required`),
    tags: parseRequiredStringArray(value.tags, `Comment ${field}.tags must be an array`),
    ...(keywords === undefined ? {} : { keywords }),
  };
}

async function mapServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof CommentsServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
      });
    }

    throw error;
  }
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwInvalidInput(`Comment ${field} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseOptionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throwInvalidInput(`Comment ${field} must be a string or null`);
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidInput(message);
  }

  return value.trim();
}

function parseRequiredStringArray(value: unknown, message: string): string[] {
  if (!Array.isArray(value)) {
    throwInvalidInput(message);
  }

  if (!value.every((item) => typeof item === 'string')) {
    throwInvalidInput('Comment tags must contain only strings');
  }

  return value;
}

function parseRequiredNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwInvalidInput(message);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwInvalidInput(message: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message,
  });
}
