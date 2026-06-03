import { Module } from '@nestjs/common';

import { AdminSessionGuard } from '../../common/guards/admin-session.guard.js';
import { UserSessionGuard } from '../../common/guards/user-session.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

@Module({
  providers: [AuthRepository, AuthService, UserSessionGuard, AdminSessionGuard],
  exports: [AuthService, UserSessionGuard, AdminSessionGuard],
})
export class AuthModule {}
