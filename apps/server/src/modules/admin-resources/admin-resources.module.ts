import { Module } from '@nestjs/common';

import { AdminResourcesRepository } from './admin-resources.repository.js';
import { AdminResourcesService } from './admin-resources.service.js';

@Module({
  providers: [AdminResourcesRepository, AdminResourcesService],
  exports: [AdminResourcesService],
})
export class AdminResourcesModule {}
