import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CommentsRepository } from './comments.repository.js';
import { CommentsService, CommentsServiceError } from './comments.service.js';

test('generateSingle rejects invalid gender before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '未知' as never,
        grade: '三年级',
        tags: ['思维活跃'],
      }),
    serviceError('BAD_REQUEST', 'Comment gender must be 男 or 女')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle rejects empty grade before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '男',
        grade: '   ',
        tags: ['思维活跃'],
      }),
    serviceError('BAD_REQUEST', 'Comment grade is required')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle rejects invalid tags before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '男',
        grade: '三年级',
        tags: ['不存在的标签'],
      }),
    serviceError('BAD_REQUEST', 'Comment tags contain unsupported values')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle creates a comment session when sessionId is absent', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.generateSingle({
    userId: 'user-1',
    nickname: '小林',
    gender: '男',
    grade: '三年级',
    tags: ['思维活跃'],
  });

  assert.equal(result.sessionId, 'session-1');
  assert.equal(repository.singleCalls, 1);
  assert.equal(repository.conversations[0]?.category, 'comment');
  assert.equal(repository.messages.length, 2);
  assert.equal(repository.messages[0]?.role, 'user');
  assert.equal(repository.messages[1]?.role, 'assistant');
});

test('generateSingle rejects invalid comment session before returning comments', async () => {
  const repository = new FakeCommentsRepository();
  repository.conversations.push({
    id: 'chat-session',
    userId: 'user-1',
    category: 'chat',
  });
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        sessionId: 'chat-session',
        gender: '男',
        grade: '三年级',
        tags: ['思维活跃'],
      }),
    serviceError('NOT_FOUND', 'Comment conversation not found')
  );
  assert.equal(repository.messages.length, 0);
});

test('createFromUpload accepts file metadata and returns mock row previews', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tone: '温和鼓励',
  });

  assert.equal(result.job.fileName, 'comments.xlsx');
  assert.equal(result.job.status, 'pending');
  assert.equal(result.rowPreviews.length, 3);
  assert.deepEqual(result.rowPreviews[0]?.comments, []);
  assert.equal(repository.jobs.length, 1);
  assert.equal(repository.rows.length, 3);
});

test('createFromUpload rejects zero-byte files before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createFromUpload({
        userId: 'user-1',
        fileName: 'comments.xlsx',
        fileSize: 0,
      }),
    serviceError('BAD_REQUEST', 'Comment upload fileSize must be a positive integer')
  );
  assert.equal(repository.jobs.length, 0);
});

test('generateRow updates the row status to success', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  const result = await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  assert.equal(result.row.status, 'success');
  assert.equal(repository.rows[0]?.status, 'success');
  assert.equal((repository.rows[0]?.generatedResults as string[] | undefined)?.length, 3);
});

test('generateAll returns completed aggregate after multiple row generations', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  const result = await service.generateAll({
    userId: 'user-1',
    jobId: 'job-1',
  });

  assert.equal(result.job.status, 'completed');
  assert.equal(result.job.successRows, 3);
  assert.equal(result.job.failedRows, 0);
  assert.equal(result.rows.length, 3);
  assert.equal(
    result.rows.every((row) => row.status === 'success'),
    true
  );
});

test('exportBatch returns an Excel base64 payload', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });
  await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  const result = await service.exportBatch({
    userId: 'user-1',
    jobId: 'job-1',
  });

  assert.equal(result.fileName.endsWith('.xlsx'), true);
  assert.equal(
    result.mimeType,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.equal(typeof result.contentBase64, 'string');
  assert.equal(Buffer.from(result.contentBase64, 'base64').subarray(0, 2).toString(), 'PK');
});

type JobRow = {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  tone: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: Date;
  updatedAt: Date;
};

type BatchRow = {
  id: string;
  jobId: string;
  rowIndex: number;
  nickname: string | null;
  gender: '男' | '女';
  grade: string;
  tags: string[];
  keywords: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  generatedResults: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ConversationRow = {
  id: string;
  userId: string;
  category: 'chat' | 'inspiration' | 'comment' | 'teaching';
};

type MessageRow = {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
};

class FakeCommentsRepository {
  singleCalls = 0;
  readonly jobs: JobRow[] = [];
  readonly rows: BatchRow[] = [];
  readonly conversations: ConversationRow[] = [];
  readonly messages: MessageRow[] = [];

  asRepository(): CommentsRepository {
    return this as unknown as CommentsRepository;
  }

  async saveSingleGeneration(input: {
    userId: string;
    sessionId?: string;
    nickname?: string | null;
    gender: '男' | '女';
    grade: string;
    tags: string[];
    keywords?: string | null;
    tone: string;
    comments: string[];
  }): Promise<{ sessionId: string } | null> {
    this.singleCalls += 1;

    let conversation = input.sessionId
      ? this.conversations.find(
          (item) =>
            item.id === input.sessionId &&
            item.userId === input.userId &&
            item.category === 'comment'
        )
      : undefined;

    if (input.sessionId && !conversation) {
      return null;
    }

    if (!conversation) {
      conversation = {
        id: `session-${this.conversations.length + 1}`,
        userId: input.userId,
        category: 'comment',
      };
      this.conversations.push(conversation);
    }

    this.messages.push(
      {
        conversationId: conversation.id,
        role: 'user',
        content: input.nickname ? `${input.nickname}评语生成` : '评语生成',
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: input.comments.join('\n\n'),
      }
    );

    return { sessionId: conversation.id };
  }

  async createBatch(input: {
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
    tone: string;
    rows: Array<{
      rowIndex: number;
      nickname?: string | null;
      gender: '男' | '女';
      grade: string;
      tags: string[];
      keywords?: string | null;
    }>;
  }): Promise<{ job: JobRow; rows: BatchRow[] }> {
    const now = new Date('2026-05-20T00:00:00.000Z');
    const job: JobRow = {
      id: 'job-1',
      userId: input.userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType ?? null,
      tone: input.tone,
      status: 'pending',
      totalRows: input.rows.length,
      successRows: 0,
      failedRows: 0,
      createdAt: now,
      updatedAt: now,
    };
    const rows = input.rows.map((row, index) => ({
      id: `row-${index + 1}`,
      jobId: job.id,
      rowIndex: row.rowIndex,
      nickname: row.nickname ?? null,
      gender: row.gender,
      grade: row.grade,
      tags: row.tags,
      keywords: row.keywords ?? null,
      status: 'pending' as const,
      generatedResults: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    }));

    this.jobs.push(job);
    this.rows.push(...rows);

    return { job, rows };
  }

  async findBatchForUser(
    userId: string,
    jobId: string
  ): Promise<{ job: JobRow; rows: BatchRow[] } | null> {
    const job = this.jobs.find((item) => item.id === jobId && item.userId === userId);

    if (!job) {
      return null;
    }

    return {
      job,
      rows: this.rows.filter((row) => row.jobId === job.id),
    };
  }

  async updateRowGenerated(input: {
    jobId: string;
    rowId: string;
    generatedResults: string[];
  }): Promise<{ job: JobRow; row: BatchRow } | null> {
    const job = this.jobs.find((item) => item.id === input.jobId);
    const row = this.rows.find((item) => item.id === input.rowId && item.jobId === input.jobId);

    if (!job || !row) {
      return null;
    }

    row.status = 'success';
    row.generatedResults = input.generatedResults;
    row.updatedAt = new Date('2026-05-20T00:01:00.000Z');
    job.successRows = this.rows.filter(
      (item) => item.jobId === job.id && item.status === 'success'
    ).length;
    job.status = job.successRows === job.totalRows ? 'completed' : 'running';
    job.updatedAt = row.updatedAt;

    return { job, row };
  }
}

function serviceError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof CommentsServiceError && error.code === code && error.message === message;
}
