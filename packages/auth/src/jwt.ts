import { createHmac, timingSafeEqual } from 'node:crypto';

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

export type JsonObject = {
  [key: string]: JsonValue;
};

export type JwtPayload = JsonObject & {
  exp?: number;
  iat?: number;
};

export type SignTokenOptions = {
  expiresInSeconds?: number;
  now?: Date | number;
};

export type VerifyTokenOptions = {
  clockToleranceSeconds?: number;
  now?: Date | number;
};

const algorithm = 'HS256';
const tokenType = 'JWT';

const toUnixSeconds = (now: Date | number | undefined) => {
  if (now instanceof Date) {
    const time = now.getTime();

    if (!Number.isFinite(time)) {
      throw new Error('Invalid token time');
    }

    return Math.floor(time / 1000);
  }

  if (typeof now === 'number') {
    if (!Number.isFinite(now)) {
      throw new Error('Invalid token time');
    }

    return Math.floor(now);
  }

  return Math.floor(Date.now() / 1000);
};

const encodeBase64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

const decodeBase64UrlJson = (value: string, errorMessage: string): unknown => {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new Error(errorMessage);
  }
};

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sign = (data: string, secret: string) =>
  createHmac('sha256', secret).update(data).digest('base64url');

const assertTokenSecret = (secret: string) => {
  if (secret.trim().length === 0) {
    throw new Error('Token secret is required');
  }
};

const getClockToleranceSeconds = (clockToleranceSeconds: number | undefined) => {
  if (clockToleranceSeconds === undefined) {
    return 0;
  }

  if (!Number.isFinite(clockToleranceSeconds)) {
    throw new Error('Invalid clock tolerance');
  }

  return clockToleranceSeconds;
};

const assertTokenDuration = (expiresInSeconds: number) => {
  if (!Number.isFinite(expiresInSeconds)) {
    throw new Error('Invalid token duration');
  }
};

const hasValidSignature = (data: string, signature: string, secret: string) => {
  const expected = sign(data, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)
  );
};

export const createSignedToken = (
  payload: JwtPayload,
  secret: string,
  options: SignTokenOptions = {}
) => {
  assertTokenSecret(secret);

  const now = toUnixSeconds(options.now);
  const claims: JwtPayload = { ...payload, iat: payload.iat ?? now };

  if (options.expiresInSeconds !== undefined) {
    assertTokenDuration(options.expiresInSeconds);
    claims.exp = now + options.expiresInSeconds;
  }

  const header = encodeBase64Url(JSON.stringify({ alg: algorithm, typ: tokenType }));
  const body = encodeBase64Url(JSON.stringify(claims));
  const data = `${header}.${body}`;

  return `${data}.${sign(data, secret)}`;
};

export const verifySignedToken = <TPayload extends JwtPayload = JwtPayload>(
  token: string,
  secret: string,
  options: VerifyTokenOptions = {}
) => {
  assertTokenSecret(secret);

  const parts = token.split('.');
  const [headerPart, bodyPart, signaturePart] = parts;

  if (parts.length !== 3 || !headerPart || !bodyPart || !signaturePart) {
    throw new Error('Invalid token format');
  }

  const header = decodeBase64UrlJson(headerPart, 'Invalid token header');

  if (!isJsonObject(header) || header.alg !== algorithm || header.typ !== tokenType) {
    throw new Error('Invalid token header');
  }

  const data = `${headerPart}.${bodyPart}`;

  if (!hasValidSignature(data, signaturePart, secret)) {
    throw new Error('Invalid token signature');
  }

  const payload = decodeBase64UrlJson(bodyPart, 'Invalid token payload');

  if (!isJsonObject(payload)) {
    throw new Error('Invalid token payload');
  }

  if (payload.exp !== undefined) {
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      throw new Error('Invalid token expiration');
    }

    const now = toUnixSeconds(options.now);
    const tolerance = getClockToleranceSeconds(options.clockToleranceSeconds);

    if (payload.exp + tolerance <= now) {
      throw new Error('Token expired');
    }
  }

  return payload as TPayload;
};
