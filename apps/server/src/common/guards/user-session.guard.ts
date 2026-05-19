import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';

import { AuthService, type UserSession } from '../../modules/auth/auth.service.js';
import type { TRPCContext } from '../../trpc/context.js';

@Injectable()
export class UserSessionGuard {
  constructor(private readonly authService: AuthService) {}

  async require(context: TRPCContext): Promise<UserSession> {
    return requireUserSession(this.authService, context);
  }
}

export async function requireUserSession(
  authService: AuthService,
  context: TRPCContext
): Promise<UserSession> {
  const session = await authService.resolveUserSession(context);

  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User session required',
    });
  }

  return session;
}
