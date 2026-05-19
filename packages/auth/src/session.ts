export type SessionPayload = {
  userId: string;
  role: 'user' | 'admin';
};

export const sessionKey = (token: string) => `session:${token}`;
export const adminSessionKey = (token: string) => `admin:session:${token}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const serializeSessionPayload = (payload: SessionPayload) => JSON.stringify(payload);

export const parseSessionPayload = (value: string): SessionPayload => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('Invalid session payload');
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid session payload');
  }

  if (typeof parsed.userId !== 'string') {
    throw new Error('Invalid session userId');
  }

  if (parsed.role !== 'user' && parsed.role !== 'admin') {
    throw new Error('Invalid session role');
  }

  return {
    userId: parsed.userId,
    role: parsed.role,
  };
};
