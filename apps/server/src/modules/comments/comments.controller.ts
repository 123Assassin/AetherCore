import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { CommentSingleGenerateInput, CommentSingleGenerateStreamEvent } from '@package/shared';

import type { TRPCContext } from '../../trpc/context.js';
import { AuthService } from '../auth/auth.service.js';
import { CommentsService, CommentsServiceError } from './comments.service.js';

type StreamRequest = TRPCContext['req'] & {
  headers: TRPCContext['req']['headers'] & {
    origin?: string | string[];
  };
};

type StreamReply = TRPCContext['res'] & {
  code: (statusCode: number) => StreamReply;
  send: (payload: unknown) => void;
  raw: {
    end: () => void;
    write: (chunk: string) => boolean;
    writeHead: (statusCode: number, headers: Record<string, string>) => void;
  };
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

@Controller('api/comments')
export class CommentsController {
  constructor(
    private readonly authService: AuthService,
    private readonly commentsService: CommentsService
  ) {}

  @Post('single/generate/stream')
  async generateSingleStream(
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

    let input: CommentSingleGenerateInput;

    try {
      input = parseSingleGenerateInput(body);
    } catch (error) {
      sendJsonError(reply, 400, 'BAD_REQUEST', readErrorMessage(error, 'Invalid comment input'));
      return;
    }

    reply.raw.writeHead(200, {
      ...getCorsHeaders(request),
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    });

    try {
      const result = await this.commentsService.generateSingleStream(
        {
          userId: session.user.id,
          ...input,
        },
        (content) => {
          sendStreamEvent(reply, { type: 'delta', content });
        }
      );

      sendStreamEvent(reply, { type: 'result', result });
      sendStreamEvent(reply, { type: 'done' });
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

function parseSingleGenerateInput(input: unknown): CommentSingleGenerateInput {
  if (!isRecord(input)) {
    throw new Error('Comment single generate input must be an object');
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

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Comment ${field} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function parseRequiredStringArray(value: unknown, message: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`Comment tags[${index}] must be a string`);
    }

    return item.trim();
  });
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

function sendStreamEvent(reply: StreamReply, event: CommentSingleGenerateStreamEvent): void {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

function mapStreamError(error: unknown): { code: string; message: string } {
  if (error instanceof CommentsServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: readErrorMessage(error, 'Comment generation failed'),
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
