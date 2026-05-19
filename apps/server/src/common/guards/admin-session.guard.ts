import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';

import { type AdminSession, AuthService } from '../../modules/auth/auth.service.js';
import type { TRPCContext } from '../../trpc/context.js';

@Injectable()
export class AdminSessionGuard {
  constructor(private readonly authService: AuthService) {}

  async optional(context: TRPCContext): Promise<AdminSession | null> {
    return resolveAdminSession(this.authService, context);
  }

  async require(context: TRPCContext): Promise<AdminSession> {
    const session = await this.optional(context);

    if (!session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Admin session required',
      });
    }

    return session;
  }
}

export async function resolveAdminSession(
  authService: AuthService,
  context: TRPCContext
): Promise<AdminSession | null> {
  return authService.resolveAdminSession(context);
}

export async function requireAdminSession(
  authService: AuthService,
  context: TRPCContext
): Promise<AdminSession> {
  const session = await resolveAdminSession(authService, context);

  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Admin session required',
    });
  }

  return session;
}
