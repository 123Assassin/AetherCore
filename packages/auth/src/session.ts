export type SessionPayload = {
  userId: string;
  role: 'user' | 'admin';
};

export const sessionKey = (token: string) => `session:${token}`;
export const adminSessionKey = (token: string) => `admin:session:${token}`;
