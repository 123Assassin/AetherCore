import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const API_KEY_CIPHER_PREFIX = 'v1';

export class EngineApiKeyCryptoError extends Error {}

export function encryptEngineApiKey(apiKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getApiKeyEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    API_KEY_CIPHER_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptEngineApiKey(apiKeyCiphertext: string): string {
  if (!apiKeyCiphertext.startsWith(`${API_KEY_CIPHER_PREFIX}:`)) {
    return Buffer.from(apiKeyCiphertext, 'base64').toString('utf8');
  }

  try {
    const [, iv, tag, ciphertext] = apiKeyCiphertext.split(':');

    if (!iv || !tag || !ciphertext) {
      return '';
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      getApiKeyEncryptionKey(),
      Buffer.from(iv, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

export function maskEngineApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '*'.repeat(Math.max(apiKey.length, 1));
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function getApiKeyEncryptionKey(): Buffer {
  const secret =
    process.env.AETHERCORE_ENGINE_API_KEY_SECRET ??
    (process.env.NODE_ENV === 'test' ? 'aethercore-admin-resources-test-key' : undefined);

  if (!secret) {
    throw new EngineApiKeyCryptoError('Engine API key encryption secret is not configured');
  }

  return createHash('sha256').update(secret).digest();
}
