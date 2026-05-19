export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'UNAUTHORIZED' | 'FORBIDDEN';

export type AuthError = {
  code: AuthErrorCode;
  message: string;
};

export type AuthUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

export type AdminLoginInput = {
  username: string;
  password: string;
};

export type AdminLoginData = {
  user: AuthUserSummary;
};

export type AuthSuccessResult<TData> = {
  success: true;
  data: TData;
};

export type AuthFailureResult = {
  success: false;
  error: AuthError;
};

export type AuthResult<TData> = AuthSuccessResult<TData> | AuthFailureResult;

export type AdminLoginResult = AuthResult<AdminLoginData>;

export type AdminSessionResult =
  | {
      authenticated: true;
      user: AuthUserSummary;
    }
  | {
      authenticated: false;
      user?: never;
    };

export type WeChatLoginUrlResult = {
  url: string;
  state: string;
  expiresInSeconds: number;
};

export type LogoutResult = {
  success: true;
};
