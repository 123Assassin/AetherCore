export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'UNAUTHORIZED' | 'FORBIDDEN';

export type AuthError = {
  code: AuthErrorCode;
  message: string;
};

export type AuthUserSummary = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
};

export type AdminLoginInput = {
  user: string;
  password: string;
};

export type UserLoginInput = AdminLoginInput;

export type AdminLoginData = {
  user: AuthUserSummary;
};

export type UserLoginData = AdminLoginData;

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
export type UserLoginResult = AuthResult<UserLoginData>;

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

export type WeChatLoginConfigResult = {
  appId: string;
  redirectUri: string;
  scope: 'snsapi_login';
  state: string;
  expiresInSeconds: number;
};

export type WeChatCallbackInput = {
  code: string;
  state: string;
};

export type WeChatLoginResult = AuthSuccessResult<{
  user: AuthUserSummary;
}>;

export type LogoutResult = {
  success: true;
};
