import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  aiConversations,
  aiMessages,
  commentBatchJobs,
  commentBatchRows,
  type CommentBatchJobStatus,
  type CommentBatchRowStatus,
} from '@package/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export type CommentBatchJobRow = typeof commentBatchJobs.$inferSelect;
export type CommentBatchRowRecord = typeof commentBatchRows.$inferSelect;

export type CommentBatchCreateRowInput = {
  rowIndex: number;
  nickname?: string | null;
  gender: '男' | '女';
  grade: string;
  tags: string[];
  keywords?: string | null;
};

export type CommentBatchCreateInput = {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
  tone: string;
  rows: CommentBatchCreateRowInput[];
};

@Injectable()
export class CommentsRepository {
  private readonly database: Database = db;

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
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      let conversation: typeof aiConversations.$inferSelect | undefined;

      if (input.sessionId) {
        const [existingConversation] = await transaction
          .select()
          .from(aiConversations)
          .where(
            and(
              eq(aiConversations.id, input.sessionId),
              eq(aiConversations.userId, input.userId),
              eq(aiConversations.category, 'comment'),
              eq(aiConversations.isDeleted, false)
            )
          )
          .limit(1);

        if (!existingConversation) {
          return null;
        }

        conversation = existingConversation;
      } else {
        const [createdConversation] = await transaction
          .insert(aiConversations)
          .values({
            userId: input.userId,
            category: 'comment',
            title: createCommentConversationTitle(input.nickname),
            metadata: {
              source: 'comments.single.generate',
            },
            updatedAt: now,
          })
          .returning();

        if (!createdConversation) {
          throw new Error('Failed to create comment conversation');
        }

        conversation = createdConversation;
      }

      const [userMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'user',
          content: createCommentUserMessage(input),
          payload: {
            nickname: input.nickname ?? null,
            gender: input.gender,
            grade: input.grade,
            tags: input.tags,
            keywords: input.keywords ?? null,
            tone: input.tone,
          },
          updatedAt: now,
        })
        .returning({ id: aiMessages.id });

      if (!userMessage) {
        throw new Error('Failed to create comment user message');
      }

      const [assistantMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'assistant',
          content: input.comments.join('\n\n'),
          updatedAt: now,
        })
        .returning({ id: aiMessages.id });

      if (!assistantMessage) {
        throw new Error('Failed to create comment assistant message');
      }

      const [updatedConversation] = await transaction
        .update(aiConversations)
        .set({ updatedAt: now })
        .where(and(eq(aiConversations.id, conversation.id), eq(aiConversations.isDeleted, false)))
        .returning({ id: aiConversations.id });

      if (!updatedConversation) {
        return null;
      }

      return { sessionId: updatedConversation.id };
    });
  }

  async createBatch(input: CommentBatchCreateInput): Promise<{
    job: CommentBatchJobRow;
    rows: CommentBatchRowRecord[];
  }> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [job] = await transaction
        .insert(commentBatchJobs)
        .values({
          userId: input.userId,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType ?? null,
          tone: input.tone,
          totalRows: input.rows.length,
          updatedAt: now,
        })
        .returning();

      if (!job) {
        throw new Error('Failed to create comment batch job');
      }

      if (input.rows.length === 0) {
        return { job, rows: [] };
      }

      const rows = await transaction
        .insert(commentBatchRows)
        .values(
          input.rows.map((row) => ({
            jobId: job.id,
            rowIndex: row.rowIndex,
            nickname: row.nickname ?? null,
            gender: row.gender,
            grade: row.grade,
            tags: row.tags,
            keywords: row.keywords ?? null,
            updatedAt: now,
          }))
        )
        .returning();

      return { job, rows };
    });
  }

  async findBatchForUser(
    userId: string,
    jobId: string
  ): Promise<{ job: CommentBatchJobRow; rows: CommentBatchRowRecord[] } | null> {
    const [job] = await this.database
      .select()
      .from(commentBatchJobs)
      .where(and(eq(commentBatchJobs.id, jobId), eq(commentBatchJobs.userId, userId)))
      .limit(1);

    if (!job) {
      return null;
    }

    const rows = await this.database
      .select()
      .from(commentBatchRows)
      .where(eq(commentBatchRows.jobId, job.id))
      .orderBy(asc(commentBatchRows.rowIndex));

    return { job, rows };
  }

  async updateRowGenerated(input: {
    jobId: string;
    rowId: string;
    generatedResults: string[];
  }): Promise<{ job: CommentBatchJobRow; row: CommentBatchRowRecord } | null> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [lockedJob] = await transaction
        .select({ id: commentBatchJobs.id })
        .from(commentBatchJobs)
        .where(eq(commentBatchJobs.id, input.jobId))
        .for('update')
        .limit(1);

      if (!lockedJob) {
        return null;
      }

      const [row] = await transaction
        .update(commentBatchRows)
        .set({
          status: 'success',
          generatedResults: input.generatedResults,
          errorMessage: null,
          updatedAt: now,
        })
        .where(and(eq(commentBatchRows.id, input.rowId), eq(commentBatchRows.jobId, input.jobId)))
        .returning();

      if (!row) {
        return null;
      }

      const rows = await transaction
        .select()
        .from(commentBatchRows)
        .where(eq(commentBatchRows.jobId, input.jobId));
      const successRows = rows.filter((item) => item.status === 'success').length;
      const failedRows = rows.filter((item) => item.status === 'error').length;
      const status = getJobStatus(rows);
      const [job] = await transaction
        .update(commentBatchJobs)
        .set({
          status,
          successRows,
          failedRows,
          updatedAt: now,
        })
        .where(eq(commentBatchJobs.id, input.jobId))
        .returning();

      if (!job) {
        return null;
      }

      return { job, row };
    });
  }
}

function getJobStatus(rows: CommentBatchRowRecord[]): CommentBatchJobStatus {
  if (rows.length === 0) {
    return 'pending';
  }

  if (rows.every((row) => row.status === 'success')) {
    return 'completed';
  }

  if (rows.every((row) => row.status === 'error')) {
    return 'failed';
  }

  return 'running';
}

export function isGeneratableRowStatus(status: CommentBatchRowStatus): boolean {
  return status === 'pending' || status === 'error';
}

function createCommentConversationTitle(nickname: string | null | undefined): string {
  return nickname ? `${nickname}评语生成` : '评语生成';
}

function createCommentUserMessage(input: {
  nickname?: string | null;
  grade: string;
  tags: string[];
  keywords?: string | null;
  tone: string;
}): string {
  const name = input.nickname ?? '学生';
  const tags = input.tags.length > 0 ? input.tags.join('、') : '未填写标签';
  const keywords = input.keywords ? `，关注点：${input.keywords}` : '';

  return `请为${name}生成${input.grade}评语，语气：${input.tone}，表现标签：${tags}${keywords}`;
}
