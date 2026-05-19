import { TRPCError } from '@trpc/server';

import { requireUserSession } from '../../common/guards/user-session.guard.js';
import { AiServiceError, type AiService } from '../../modules/ai/ai.service.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

const categories = ['chat', 'inspiration', 'comment', 'teaching'] as const;
type Category = (typeof categories)[number];

export function createAiRouter(authService: AuthService, aiService: AiService, tools: RouterTools) {
  return tools.createTRPCRouter({
    chat: tools.createTRPCRouter({
      create: tools.publicProcedure.input(parseCreateInput).mutation(async ({ ctx, input }) => {
        const session = await requireUserSession(authService, ctx);

        return aiService.createChat({
          userId: session.user.id,
          ...input,
        });
      }),
      send: tools.publicProcedure.input(parseSendInput).mutation(async ({ ctx, input }) => {
        const session = await requireUserSession(authService, ctx);

        return mapServiceError(() =>
          aiService.sendChat({
            userId: session.user.id,
            ...input,
          })
        );
      }),
    }),
    history: tools.createTRPCRouter({
      list: tools.publicProcedure.input(parseHistoryListInput).query(async ({ ctx, input }) => {
        const session = await requireUserSession(authService, ctx);

        return aiService.listHistory({
          userId: session.user.id,
          ...input,
        });
      }),
      delete: tools.publicProcedure
        .input(parseHistoryDeleteInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            aiService.deleteHistory({
              userId: session.user.id,
              ...input,
            })
          );
        }),
    }),
  });
}

function parseCreateInput(input: unknown): {
  category?: Category;
  title?: string;
  metadata?: Record<string, unknown> | null;
} {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('AI chat create input must be an object');
  }

  const category = parseOptionalCategory(input.category);
  const title = parseOptionalString(input.title, 'title');
  const metadata = parseOptionalRecord(input.metadata, 'metadata');

  return {
    ...(category === undefined ? {} : { category }),
    ...(title === undefined ? {} : { title }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

function parseSendInput(input: unknown): {
  sessionId?: string;
  category?: Category;
  message: string;
  payload?: Record<string, unknown> | unknown[] | null;
} {
  if (!isRecord(input)) {
    throwInvalidInput('AI chat send input must be an object');
  }

  if (typeof input.message !== 'string' || !input.message.trim()) {
    throwInvalidInput('AI chat send requires message');
  }

  const sessionId = parseOptionalString(input.sessionId, 'sessionId');
  const category = parseOptionalCategory(input.category);
  const payload = parseOptionalPayload(input.payload, 'payload');

  return {
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(category === undefined ? {} : { category }),
    message: input.message,
    ...(payload === undefined ? {} : { payload }),
  };
}

function parseHistoryListInput(input: unknown): {
  category?: Category;
  limit?: number;
} {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throwInvalidInput('AI history list input must be an object');
  }

  const category = parseOptionalCategory(input.category);
  const limit = parseOptionalLimit(input.limit);

  return {
    ...(category === undefined ? {} : { category }),
    ...(limit === undefined ? {} : { limit }),
  };
}

function parseHistoryDeleteInput(input: unknown): { sessionId: string } {
  if (!isRecord(input)) {
    throwInvalidInput('AI history delete input must be an object');
  }

  if (typeof input.sessionId !== 'string' || !input.sessionId.trim()) {
    throwInvalidInput('AI history delete requires sessionId');
  }

  return {
    sessionId: input.sessionId.trim(),
  };
}

async function mapServiceError<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    if (isAiServiceError(error)) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
      });
    }

    throw error;
  }
}

function parseOptionalCategory(value: unknown): Category | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!categories.includes(value as Category)) {
    throwInvalidInput('Invalid AI category');
  }

  return value as Category;
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwInvalidInput(`AI ${field} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseOptionalRecord(
  value: unknown,
  field: string
): Record<string, unknown> | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throwInvalidInput(`AI ${field} must be an object`);
  }

  return value;
}

function parseOptionalPayload(
  value: unknown,
  field: string
): Record<string, unknown> | unknown[] | null | undefined {
  if (value === undefined || value === null || Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    throwInvalidInput(`AI ${field} must be an object or array`);
  }

  return value;
}

function parseOptionalLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwInvalidInput('AI history limit must be a number');
  }

  return value;
}

function isAiServiceError(error: unknown): error is AiServiceError {
  return error instanceof AiServiceError;
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
