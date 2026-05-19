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

type InspirationGenerateInput = {
  sessionId?: string;
  grade: string;
  subject: string;
  topic: string;
  context?: string;
};

type InspirationFollowUpInput = {
  sessionId: string;
  message: string;
};

const teachingModes = ['variant', 'knowledge'] as const;
const teachingVariantLevels = ['similar', 'challenge', 'creative'] as const;
const teachingKnowledgeLevels = ['foundation', 'application', 'expansion'] as const;
type TeachingMode = (typeof teachingModes)[number];
type TeachingVariantLevel = (typeof teachingVariantLevels)[number];
type TeachingKnowledgeLevel = (typeof teachingKnowledgeLevels)[number];
type TeachingLevel = TeachingVariantLevel | TeachingKnowledgeLevel;

type TeachingGenerateBaseInput = {
  sessionId?: string;
  subject: string;
  stage: string;
  prompt: string;
};

type TeachingGenerateInput =
  | (TeachingGenerateBaseInput & {
      mode: 'variant';
      level: TeachingVariantLevel;
    })
  | (TeachingGenerateBaseInput & {
      mode: 'knowledge';
      level: TeachingKnowledgeLevel;
    });

type TeachingFollowUpInput = {
  sessionId: string;
  message: string;
};

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
    inspiration: tools.createTRPCRouter({
      generate: tools.publicProcedure
        .input(parseInspirationGenerateInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            aiService.generateInspiration({
              userId: session.user.id,
              ...input,
            })
          );
        }),
      followUp: tools.publicProcedure
        .input(parseInspirationFollowUpInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            aiService.followUpInspiration({
              userId: session.user.id,
              ...input,
            })
          );
        }),
    }),
    teaching: tools.createTRPCRouter({
      generate: tools.publicProcedure
        .input(parseTeachingGenerateInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            aiService.generateTeaching({
              userId: session.user.id,
              ...input,
            })
          );
        }),
      followUp: tools.publicProcedure
        .input(parseTeachingFollowUpInput)
        .mutation(async ({ ctx, input }) => {
          const session = await requireUserSession(authService, ctx);

          return mapServiceError(() =>
            aiService.followUpTeaching({
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

function parseInspirationGenerateInput(input: unknown): InspirationGenerateInput {
  if (!isRecord(input)) {
    throwInvalidInput('AI inspiration generate input must be an object');
  }

  const sessionId = parseOptionalString(input.sessionId, 'sessionId');
  const grade = parseRequiredString(input.grade, 'AI inspiration generate requires grade');
  const subject = parseRequiredString(input.subject, 'AI inspiration generate requires subject');
  const topic = parseRequiredString(input.topic, 'AI inspiration generate requires topic');
  const context = parseOptionalString(input.context, 'context');

  return {
    ...(sessionId === undefined ? {} : { sessionId }),
    grade,
    subject,
    topic,
    ...(context === undefined ? {} : { context }),
  };
}

function parseInspirationFollowUpInput(input: unknown): InspirationFollowUpInput {
  if (!isRecord(input)) {
    throwInvalidInput('AI inspiration follow-up input must be an object');
  }

  return {
    sessionId: parseRequiredString(input.sessionId, 'AI inspiration follow-up requires sessionId'),
    message: parseRequiredString(input.message, 'AI inspiration follow-up requires message'),
  };
}

function parseTeachingGenerateInput(input: unknown): TeachingGenerateInput {
  if (!isRecord(input)) {
    throwInvalidInput('AI teaching generate input must be an object');
  }

  const sessionId = parseOptionalString(input.sessionId, 'sessionId');
  const subject = parseRequiredString(input.subject, 'AI teaching generate requires subject');
  const stage = parseRequiredString(input.stage, 'AI teaching generate requires stage');
  const mode = parseTeachingMode(input.mode);
  const prompt = parseRequiredString(input.prompt, 'AI teaching generate requires prompt');
  const level = parseTeachingLevel(input.level, mode);

  const baseInput = {
    ...(sessionId === undefined ? {} : { sessionId }),
    subject,
    stage,
    prompt,
  };

  if (mode === 'variant') {
    return {
      ...baseInput,
      mode,
      level: level as TeachingVariantLevel,
    };
  }

  return {
    ...baseInput,
    mode,
    level: level as TeachingKnowledgeLevel,
  };
}

function parseTeachingFollowUpInput(input: unknown): TeachingFollowUpInput {
  if (!isRecord(input)) {
    throwInvalidInput('AI teaching follow-up input must be an object');
  }

  return {
    sessionId: parseRequiredString(input.sessionId, 'AI teaching follow-up requires sessionId'),
    message: parseRequiredString(input.message, 'AI teaching follow-up requires message'),
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

function parseTeachingMode(value: unknown): TeachingMode {
  if (!teachingModes.includes(value as TeachingMode)) {
    throwInvalidInput('Invalid AI teaching mode');
  }

  return value as TeachingMode;
}

function parseTeachingLevel(value: unknown, mode: TeachingMode): TeachingLevel {
  if (mode === 'variant' && teachingVariantLevels.includes(value as TeachingVariantLevel)) {
    return value as TeachingVariantLevel;
  }

  if (mode === 'knowledge' && teachingKnowledgeLevels.includes(value as TeachingKnowledgeLevel)) {
    return value as TeachingKnowledgeLevel;
  }

  throwInvalidInput('Invalid AI teaching level');
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

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidInput(message);
  }

  return value.trim();
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
