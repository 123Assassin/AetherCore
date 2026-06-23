import {
  BadRequestException,
  Controller,
  ForbiddenException,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { TRPCContext } from '../../trpc/context.js';
import { AuthService } from '../auth/auth.service.js';
import { UploadsService, UploadsServiceError } from './uploads.service.js';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

@Controller('api/uploads')
export class UploadsController {
  constructor(
    private readonly authService: AuthService,
    private readonly uploadsService: UploadsService
  ) {}

  @Post('images')
  async uploadImage(
    @Req() request: MultipartRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const session = await this.authService.resolveUserSession({
      req: request,
      res: reply,
    } as unknown as TRPCContext);

    if (!session) {
      throw new UnauthorizedException('User session required');
    }

    if (session.user.isBlacklisted) {
      throw new ForbiddenException('User is blacklisted');
    }

    const file = await request.file();

    if (!file) {
      throw new BadRequestException('Upload image file is required');
    }

    try {
      return await this.uploadsService.saveImage({
        buffer: await file.toBuffer(),
        fileName: file.filename,
        mimeType: file.mimetype,
      });
    } catch (error) {
      if (isMultipartUploadError(error)) {
        throw new BadRequestException('Uploaded image is too large');
      }

      if (error instanceof UploadsServiceError && error.code === 'BAD_REQUEST') {
        throw new BadRequestException(error.message);
      }

      if (error instanceof UploadsServiceError) {
        throw new InternalServerErrorException(error.message);
      }

      throw error;
    }
  }
}

function isMultipartUploadError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('FST_')
  );
}
