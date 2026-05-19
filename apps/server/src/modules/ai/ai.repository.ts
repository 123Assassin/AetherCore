import { Injectable } from '@nestjs/common';
import type { Database } from '@package/db';
import { db } from '@package/db';
import { aiConversations, aiMessages } from '@package/db/schema';
import type { ConversationCategory, MessageRole } from '@package/db/schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

export type AiConversationRow = typeof aiConversations.$inferSelect;
export type AiMessageRow = typeof aiMessages.$inferSelect;

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

      const [updatedConversation] = await transaction
        .update(aiConversations)
        .set({ updatedAt: now })
        .where(and(eq(aiConversations.id, conversation.id), eq(aiConversations.isDeleted, false)))
        .returning();

      if (!updatedConversation) {
        throw new Error('Failed to update AI conversation');
      }

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
      .orderBy(asc(aiMessages.createdAt));
  }

  async softDeleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const [conversation] = await this.database
      .update(aiConversations)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId),
          eq(aiConversations.isDeleted, false)
        )
      )
      .returning({ id: aiConversations.id });

    return Boolean(conversation);
  }
}
