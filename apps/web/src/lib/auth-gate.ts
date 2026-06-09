export const LOGIN_REQUIRED_MESSAGE = '请先登录后继续使用红笔AI。';
export const CHAT_LOGIN_REQUIRED_MESSAGE = '请先登录后再使用 AI 助手。';

export function getLoggedOutRedirectPath(pathname: string | null | undefined): string | null {
  const normalizedPathname = pathname?.trim() || '/';

  return normalizedPathname === '/' ? null : '/';
}

export function isUserSessionRequiredError(error: unknown): boolean {
  return error instanceof Error && error.message === 'User session required';
}

export function getLoginRequiredMessage(scope?: 'chat'): string {
  return scope === 'chat' ? CHAT_LOGIN_REQUIRED_MESSAGE : LOGIN_REQUIRED_MESSAGE;
}
