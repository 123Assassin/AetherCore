import { Module } from '@nestjs/common';

import { CommentsRepository } from './comments.repository.js';
import { CommentsService } from './comments.service.js';

@Module({
  providers: [CommentsRepository, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
