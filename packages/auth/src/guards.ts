export type UserGuardPayload = {
  userId: string;
  role: 'user';
};

export type AdminGuardPayload = {
  userId: string;
  role: 'admin';
};

export type GuardPayload = UserGuardPayload | AdminGuardPayload;

export type GuardFailureReason = 'missing_token' | 'invalid_token' | 'expired_token' | 'forbidden';

export type GuardSuccess<TPayload extends GuardPayload = GuardPayload> = {
  ok: true;
  payload: TPayload;
};

export type GuardFailure = {
  ok: false;
  reason: GuardFailureReason;
};

export type GuardResult<TPayload extends GuardPayload = GuardPayload> =
  | GuardSuccess<TPayload>
  | GuardFailure;
