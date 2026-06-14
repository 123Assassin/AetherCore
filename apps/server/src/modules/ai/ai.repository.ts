import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import {
  aiAgents,
  aiConversations,
  aiMessages,
  aiModelCalls,
  aiPrompts,
  contentAuditSessions,
  modelEngines,
  sensitiveWordLists,
  users,
} from '@package/db/schema';
import type { AiAgentKey, ConversationCategory, MessageRole } from '@package/db/schema';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import type { AiAgentRuntimeConfig, AiEngineRuntimeConfig } from './ai-agent-runtime.js';

export type AiConversationRow = typeof aiConversations.$inferSelect;
export type AiMessageRow = typeof aiMessages.$inferSelect;
export type AiAgentRuntimeConfigLookup = {
  grade?: string | null;
  subject?: string | null;
};

type ChatExchangeInput = {
  conversation?: AiConversationRow;
  createConversation?: {
    userId: string;
    category: ConversationCategory;
    title: string;
    metadata?: Record<string, unknown> | null;
  };
  userMessage: {
    content: string;
    payload?: Record<string, unknown> | unknown[] | null;
  };
  assistantMessage: {
    content: string;
    suggestions?: string[] | null;
    workflowName?: string | null;
    redirectTo?: string | null;
  };
  modelCall: {
    agentId?: string | null;
    engineId?: string | null;
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    costAmount: number;
    currency: string;
  };
};

type ChatExchangeResult = {
  conversation: AiConversationRow;
  userMessage: AiMessageRow;
  assistantMessage: AiMessageRow;
};

@Injectable()
export class AiRepository {
  private readonly database: Database = db;

  async createConversation(input: {
    userId: string;
    category: ConversationCategory;
    title: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AiConversationRow> {
    const [conversation] = await this.database
      .insert(aiConversations)
      .values({
        userId: input.userId,
        category: input.category,
        title: input.title,
        metadata: input.metadata ?? null,
      })
      .returning();

    if (!conversation) {
      throw new Error('Failed to create AI conversation');
    }

    return conversation;
  }

  async findConversationForUser(
    userId: string,
    conversationId: string
  ): Promise<AiConversationRow | null> {
    const [conversation] = await this.database
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId),
          eq(aiConversations.isDeleted, false)
        )
      )
      .limit(1);

    return conversation ?? null;
  }

  async listConversations(input: {
    userId: string;
    category?: ConversationCategory;
    limit: number;
  }): Promise<AiConversationRow[]> {
    const filters = [
      eq(aiConversations.userId, input.userId),
      eq(aiConversations.isDeleted, false),
    ];

    if (input.category) {
      filters.push(eq(aiConversations.category, input.category));
    }

    return this.database
      .select()
      .from(aiConversations)
      .where(and(...filters))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(input.limit);
  }

  async appendMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    payload?: Record<string, unknown> | unknown[] | null;
    suggestions?: string[] | null;
    workflowName?: string | null;
    redirectTo?: string | null;
  }): Promise<AiMessageRow> {
    const now = new Date();
    const [message] = await this.database
      .insert(aiMessages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        payload: input.payload ?? null,
        suggestions: input.suggestions ?? null,
        workflowName: input.workflowName ?? null,
        redirectTo: input.redirectTo ?? null,
      })
      .returning();

    if (!message) {
      throw new Error('Failed to create AI message');
    }

    await this.database
      .update(aiConversations)
      .set({ updatedAt: now })
      .where(eq(aiConversations.id, input.conversationId));

    return message;
  }

  async findAgentRuntimeConfigByKey(
    key: ConversationCategory,
    classification: AiAgentRuntimeConfigLookup = {}
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

  async findFirstEnabledVisionEngine(): Promise<AiEngineRuntimeConfig | null> {
    const [engine] = await this.database
      .select({
        id: modelEngines.id,
        name: modelEngines.name,
        apiBaseUrl: modelEngines.apiBaseUrl,
        apiKeyCiphertext: modelEngines.apiKeyCiphertext,
        modelName: modelEngines.modelName,
        status: modelEngines.status,
      })
      .from(modelEngines)
      .where(
        and(
          eq(modelEngines.category, 'vision'),
          eq(modelEngines.status, 'enabled'),
          isNull(modelEngines.deletedAt)
        )
      )
      .orderBy(asc(modelEngines.name))
      .limit(1);

    return engine ?? null;
  }

  async saveChatExchange(input: ChatExchangeInput): Promise<ChatExchangeResult> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      let conversation = input.conversation;

      if (!conversation) {
        if (!input.createConversation) {
          throw new Error('AI conversation input is required');
        }

        const [createdConversation] = await transaction
          .insert(aiConversations)
          .values({
            userId: input.createConversation.userId,
            category: input.createConversation.category,
            title: input.createConversation.title,
            metadata: input.createConversation.metadata ?? null,
            updatedAt: now,
          })
          .returning();

        if (!createdConversation) {
          throw new Error('Failed to create AI conversation');
        }

        conversation = createdConversation;
      }

      const [userMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'user',
          content: input.userMessage.content,
          payload: input.userMessage.payload ?? null,
        })
        .returning();

      if (!userMessage) {
        throw new Error('Failed to create user AI message');
      }

      const [assistantMessage] = await transaction
        .insert(aiMessages)
        .values({
          conversationId: conversation.id,
          role: 'assistant',
          content: input.assistantMessage.content,
          suggestions: input.assistantMessage.suggestions ?? null,
          workflowName: input.assistantMessage.workflowName ?? null,
          redirectTo: input.assistantMessage.redirectTo ?? null,
        })
        .returning();

      if (!assistantMessage) {
        throw new Error('Failed to create assistant AI message');
      }

      await transaction.insert(aiModelCalls).values({
        agentId: input.modelCall.agentId ?? null,
        engineId: input.modelCall.engineId ?? null,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        userId: conversation.userId,
        modelName: input.modelCall.modelName,
        promptTokens: input.modelCall.promptTokens,
        completionTokens: input.modelCall.completionTokens,
        totalTokens: input.modelCall.totalTokens,
        latencyMs: input.modelCall.latencyMs,
        costAmount: input.modelCall.costAmount,
        currency: input.modelCall.currency,
        status: 'success',
      });

      const [updatedConversation] = await transaction
        .update(aiConversations)
        .set({ updatedAt: now })
        .where(and(eq(aiConversations.id, conversation.id), eq(aiConversations.isDeleted, false)))
        .returning();

      if (!updatedConversation) {
        throw new Error('Failed to update AI conversation');
      }

      const [user] = await transaction
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, updatedConversation.userId))
        .limit(1);

      await transaction
        .insert(contentAuditSessions)
        .values({
          conversationId: updatedConversation.id,
          userId: updatedConversation.userId,
          userEmail: user?.email ?? 'unknown',
          category: updatedConversation.category,
          title: updatedConversation.title,
          messageCount: 2,
          lastMessageAt: assistantMessage.createdAt,
          metadata: updatedConversation.metadata,
          isDeleted: updatedConversation.isDeleted,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: contentAuditSessions.conversationId,
          set: {
            userEmail: user?.email ?? 'unknown',
            category: updatedConversation.category,
            title: updatedConversation.title,
            messageCount: sql`${contentAuditSessions.messageCount} + 2`,
            lastMessageAt: assistantMessage.createdAt,
            metadata: updatedConversation.metadata,
            isDeleted: updatedConversation.isDeleted,
            updatedAt: now,
          },
        });

      return {
        conversation: updatedConversation,
        userMessage,
        assistantMessage,
      };
    });
  }

  async listMessagesForConversations(conversationIds: string[]): Promise<AiMessageRow[]> {
    if (conversationIds.length === 0) {
      return [];
    }

    return this.database
      .select()
      .from(aiMessages)
      .where(inArray(aiMessages.conversationId, conversationIds))
      .orderBy(asc(aiMessages.conversationId), asc(aiMessages.messageOrder));
  }

  async softDeleteConversation(userId: string, conversationId: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [conversation] = await transaction
        .update(aiConversations)
        .set({
          isDeleted: true,
          updatedAt: now,
        })
        .where(
          and(
            eq(aiConversations.id, conversationId),
            eq(aiConversations.userId, userId),
            eq(aiConversations.isDeleted, false)
          )
        )
        .returning({ id: aiConversations.id });

      if (!conversation) {
        return false;
      }

      await transaction
        .update(contentAuditSessions)
        .set({ isDeleted: true, updatedAt: now })
        .where(eq(contentAuditSessions.conversationId, conversation.id));

      return true;
    });
  }
}

function trimClassificationValue(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}
