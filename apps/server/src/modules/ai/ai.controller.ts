import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { ConversationCategory } from '@package/db/schema';

import type { TRPCContext } from '../../trpc/context.js';
import { AuthService } from '../auth/auth.service.js';
import {
  AiService,
  AiServiceError,
  type AiChatSendInput,
  type AiStreamEvent,
} from './ai.service.js';

type StreamRequest = TRPCContext['req'] & {
  headers: TRPCContext['req']['headers'] & {
    origin?: string | string[];
  };
};

type StreamReply = TRPCContext['res'] & {
  code: (statusCode: number) => StreamReply;
  getHeader?: (name: string) => number | string | string[] | undefined;
  send: (payload: unknown) => void;
  raw: {
    end: () => void;
    write: (chunk: string) => boolean;
    writeHead: (statusCode: number, headers: Record<string, string | string[]>) => void;
  };
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

const categories = ['chat', 'inspiration', 'comment', 'teaching'] as const;

@Controller('api/ai')
export class AiController {
  constructor(
    private readonly authService: AuthService,
    private readonly aiService: AiService
  ) {}

  @Post('chat/stream')
  async sendChatStream(
    @Body() body: unknown,
    @Req() request: StreamRequest,
    @Res() reply: StreamReply
  ): Promise<void> {
    const session = await this.authService.resolveUserSession({
      req: request,
      res: reply,
    } as TRPCContext);

    if (!session) {
      sendJsonError(reply, 401, 'UNAUTHORIZED', 'User session required');
      return;
    }

    if (session.user.isBlacklisted) {
      sendJsonError(reply, 403, 'FORBIDDEN', 'User is blacklisted');
      return;
    }

    let input: Omit<AiChatSendInput, 'userId'>;

    try {
      input = parseChatStreamInput(body);
    } catch (error) {
      sendJsonError(reply, 400, 'BAD_REQUEST', readErrorMessage(error, 'Invalid AI chat input'));
      return;
    }

    reply.raw.writeHead(200, getStreamHeaders(request, reply));

    try {
      await this.aiService.sendChatStream(
        {
          userId: session.user.id,
          ...input,
        },
        (event) => {
          sendStreamEvent(reply, event);
        }
      );
    } catch (error) {
      const mappedError = mapStreamError(error);

      sendStreamEvent(reply, {
        type: 'error',
        code: mappedError.code,
        message: mappedError.message,
      });
    } finally {
      reply.raw.end();
    }
  }
}

function parseChatStreamInput(input: unknown): Omit<AiChatSendInput, 'userId'> {
  if (!isRecord(input)) {
    throw new Error('AI chat stream input must be an object');
  }

  if (typeof input.message !== 'string' || !input.message.trim()) {
    throw new Error('AI chat stream requires message');
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

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`AI chat stream ${field} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseOptionalCategory(value: unknown): ConversationCategory | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!categories.includes(value as ConversationCategory)) {
    throw new Error('AI chat stream category is invalid');
  }

  return value as ConversationCategory;
}

function parseOptionalPayload(
  value: unknown,
  field: string
): Record<string, unknown> | unknown[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || Array.isArray(value) || isRecord(value)) {
    return value;
  }

  throw new Error(`AI chat stream ${field} must be an object, array, or null`);
}

function sendJsonError(
  reply: StreamReply,
  statusCode: number,
  code: string,
  message: string
): void {
  reply.code(statusCode).send({
    error: {
      code,
      message,
    },
  } satisfies ErrorResponse);
}

function sendStreamEvent(reply: StreamReply, event: AiStreamEvent): void {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

function getStreamHeaders(
  request: StreamRequest,
  reply: StreamReply
): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {
    ...getCorsHeaders(request),
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
    'X-Accel-Buffering': 'no',
  };
  const setCookie = readReplyHeader(reply, 'Set-Cookie');

  if (setCookie) {
    headers['Set-Cookie'] = setCookie;
  }

  return headers;
}

function readReplyHeader(reply: StreamReply, name: string): string | string[] | null {
  const value = reply.getHeader?.(name) ?? reply.getHeader?.(name.toLowerCase());

  if (typeof value === 'string' || Array.isArray(value)) {
    return value;
  }

  return typeof value === 'number' ? String(value) : null;
}

function mapStreamError(error: unknown): { code: string; message: string } {
  if (error instanceof AiServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: readErrorMessage(error, 'AI chat generation failed'),
  };
}

function getCorsHeaders(request: StreamRequest): Record<string, string> {
  const origin = getSingleHeader(request.headers.origin);

  if (!origin || !getAllowedOrigins().includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };
}

function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getSingleHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
