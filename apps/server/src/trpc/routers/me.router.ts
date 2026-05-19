import { requireUserSession } from '../../common/guards/user-session.guard.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { createTRPCRouter, publicProcedure } from '../router.js';

type RouterTools = {
  createTRPCRouter: typeof createTRPCRouter;
  publicProcedure: typeof publicProcedure;
};

export function createMeRouter(authService: AuthService, tools: RouterTools) {
  return tools.createTRPCRouter({
    profile: tools.publicProcedure.query(async ({ ctx }) => {
      const session = await requireUserSession(authService, ctx);

      return authService.getProfile(session);
    }),
    preferences: tools.publicProcedure.query(async ({ ctx }) => {
      const session = await requireUserSession(authService, ctx);

      return authService.getPreferences(session);
    }),
    credits: tools.publicProcedure.query(async ({ ctx }) => {
      const session = await requireUserSession(authService, ctx);

      return authService.getCredits(session);
    }),
  });
}
