import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  aiAgents,
  aiConversations,
  aiMessages,
  aiModelCalls,
  aiPrompts,
  commentBatchJobs,
  commentBatchRows,
  contentAuditSessions,
  modelEngines,
  sensitiveWordLists,
  type AiAgentKey,
  type CommentBatchJobStatus,
  type CommentBatchRowStatus,
  users,
} from '@package/db/schema';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';

import type { AiAgentModelCall, AiAgentRuntimeConfig } from '../ai/ai-agent-runtime.js';

export type CommentBatchJobRow = typeof commentBatchJobs.$inferSelect;
export type CommentBatchRowRecord = typeof commentBatchRows.$inferSelect;
export type CommentAgentRuntimeConfigLookup = {
  grade?: string | null;
  subject?: string | null;
};

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
    subject?: string | null;
    tags: string[];
    keywords?: string | null;
    tone: string;
    comments: string[];
    modelCall?: AiAgentModelCall;
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

      const [updatedConversation] = await transaction
        .update(aiConversations)
        .set({ updatedAt: now })
        .where(and(eq(aiConversations.id, conversation.id), eq(aiConversations.isDeleted, false)))
        .returning();

      if (!updatedConversation) {
        return null;
      }

      conversation = updatedConversation;
      const userContent = createCommentUserMessage(input);
      const [userMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'user',
          content: userContent,
          payload: {
            nickname: input.nickname ?? null,
            gender: input.gender,
            grade: input.grade,
            subject: input.subject ?? null,
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

      const assistantContent = input.comments.join('\n\n');
      const [assistantMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantContent,
          updatedAt: now,
        })
        .returning({ id: aiMessages.id, createdAt: aiMessages.createdAt });

      if (!assistantMessage) {
        throw new Error('Failed to create comment assistant message');
      }

      await transaction.insert(aiModelCalls).values({
        agentId: input.modelCall?.agentId ?? null,
        engineId: input.modelCall?.engineId ?? null,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        userId: input.userId,
        modelName: input.modelCall?.modelName ?? 'Mock AI',
        promptTokens: input.modelCall?.promptTokens ?? estimateTokens(userContent),
        completionTokens: input.modelCall?.completionTokens ?? estimateTokens(assistantContent),
        totalTokens:
          input.modelCall?.totalTokens ??
          estimateTokens(userContent) + estimateTokens(assistantContent),
        latencyMs: input.modelCall?.latencyMs ?? Math.max(Date.now() - now.getTime(), 0),
        costAmount: input.modelCall?.costAmount ?? 0,
        currency: input.modelCall?.currency ?? 'CNY',
        status: 'success',
      });

      const [user] = await transaction
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      await transaction
        .insert(contentAuditSessions)
        .values({
          conversationId: conversation.id,
          userId: input.userId,
          userEmail: user?.email ?? 'unknown',
          category: 'comment',
          title: conversation.title,
          messageCount: 2,
          lastMessageAt: assistantMessage.createdAt,
          metadata: conversation.metadata,
          isDeleted: conversation.isDeleted,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: contentAuditSessions.conversationId,
          set: {
            userEmail: user?.email ?? 'unknown',
            title: conversation.title,
            messageCount: sql`${contentAuditSessions.messageCount} + 2`,
            lastMessageAt: assistantMessage.createdAt,
            metadata: conversation.metadata,
            isDeleted: conversation.isDeleted,
            updatedAt: now,
          },
        });

      return { sessionId: conversation.id };
    });
  }

  async findAgentRuntimeConfigByKey(
    key: AiAgentRuntimeConfig['agent']['key'],
    classification: CommentAgentRuntimeConfigLookup = {}
  ): Promise<AiAgentRuntimeConfig | null> {
    const grade = trimClassificationValue(classification.grade);
    const subject = trimClassificationValue(classification.subject);
    const genericClassification = and(isNull(aiAgents.grade), isNull(aiAgents.subject));
    const matchingClassification =
      grade || subject
        ? or(
            and(
              grade ? eq(aiAgents.grade, grade) : isNull(aiAgents.grade),
              subject ? eq(aiAgents.subject, subject) : isNull(aiAgents.subject)
            ),
            genericClassification
          )
        : genericClassification;
    const [row] = await this.database
      .select({
        agent: {
          id: aiAgents.id,
          key: aiAgents.key,
          grade: aiAgents.grade,
          subject: aiAgents.subject,
          name: aiAgents.name,
          temperature: aiAgents.temperature,
          topP: aiAgents.topP,
          maxTokens: aiAgents.maxTokens,
          status: aiAgents.status,
        },
        engine: {
          id: modelEngines.id,
          name: modelEngines.name,
          apiBaseUrl: modelEngines.apiBaseUrl,
          apiKeyCiphertext: modelEngines.apiKeyCiphertext,
          modelName: modelEngines.modelName,
          status: modelEngines.status,
        },
        prompt: {
          id: aiPrompts.id,
          content: aiPrompts.content,
        },
        sensitiveWordList: {
          id: sensitiveWordLists.id,
          words: sensitiveWordLists.words,
        },
      })
      .from(aiAgents)
      .innerJoin(modelEngines, eq(modelEngines.id, aiAgents.engineId))
      .leftJoin(aiPrompts, eq(aiPrompts.id, aiAgents.promptId))
      .leftJoin(sensitiveWordLists, eq(sensitiveWordLists.id, aiAgents.sensitiveListId))
      .where(
        and(
          eq(aiAgents.key, key as AiAgentKey),
          matchingClassification,
          isNull(aiAgents.deletedAt),
          isNull(modelEngines.deletedAt)
        )
      )
      .orderBy(
        sql`case when ${aiAgents.grade} is not distinct from ${grade} and ${aiAgents.subject} is not distinct from ${subject} then 0 else 1 end`
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      agent: row.agent,
      engine: row.engine,
      prompt: row.prompt?.id
        ? {
            id: row.prompt.id,
            content: row.prompt.content ?? '',
          }
        : null,
      sensitiveWordList: row.sensitiveWordList?.id
        ? {
            id: row.sensitiveWordList.id,
            words: row.sensitiveWordList.words ?? [],
          }
        : null,
    };
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
    userId: string;
    jobId: string;
    rowId: string;
    generatedResults: string[];
    modelCall?: AiAgentModelCall;
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

      const prompt = createCommentUserMessage({
        nickname: row.nickname,
        grade: row.grade,
        tags: row.tags,
        keywords: row.keywords,
        tone: '批量评语',
      });
      const assistantContent = input.generatedResults.join('\n\n');

      await transaction.insert(aiModelCalls).values({
        agentId: input.modelCall?.agentId ?? null,
        engineId: input.modelCall?.engineId ?? null,
        userId: input.userId,
        modelName: input.modelCall?.modelName ?? 'Mock AI',
        promptTokens: input.modelCall?.promptTokens ?? estimateTokens(prompt),
        completionTokens: input.modelCall?.completionTokens ?? estimateTokens(assistantContent),
        totalTokens:
          input.modelCall?.totalTokens ?? estimateTokens(prompt) + estimateTokens(assistantContent),
        latencyMs: input.modelCall?.latencyMs ?? Math.max(Date.now() - now.getTime(), 0),
        costAmount: input.modelCall?.costAmount ?? 0,
        currency: input.modelCall?.currency ?? 'CNY',
        status: 'success',
      });

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

  async updateRowComment(input: {
    userId: string;
    jobId: string;
    rowId: string;
    comment: string;
  }): Promise<{ job: CommentBatchJobRow; row: CommentBatchRowRecord } | null> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [lockedJob] = await transaction
        .select({ id: commentBatchJobs.id })
        .from(commentBatchJobs)
        .where(and(eq(commentBatchJobs.id, input.jobId), eq(commentBatchJobs.userId, input.userId)))
        .for('update')
        .limit(1);

      if (!lockedJob) {
        return null;
      }

      const [row] = await transaction
        .update(commentBatchRows)
        .set({
          status: 'success',
          generatedResults: [input.comment],
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
  return status === 'pending' || status === 'error' || status === 'success';
}

function createCommentConversationTitle(nickname: string | null | undefined): string {
  return nickname ? `${nickname}评语生成` : '评语生成';
}

function createCommentUserMessage(input: {
  nickname?: string | null;
  grade: string;
  subject?: string | null;
  tags: string[];
  keywords?: string | null;
  tone: string;
}): string {
  const name = input.nickname ?? '学生';
  const tags = input.tags.length > 0 ? input.tags.join('、') : '未填写标签';
  const subject = input.subject ? `${input.subject} ` : '';
  const keywords = input.keywords ? `，关注点：${input.keywords}` : '';

  return `请为${name}生成${input.grade}${subject}评语，语气：${input.tone}，表现标签：${tags}${keywords}`;
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function trimClassificationValue(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}
