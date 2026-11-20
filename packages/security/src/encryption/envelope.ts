import crypto from 'crypto';
import { AppError } from '@quickswap/shared';

export const AES_GCM_ALGORITHM = 'aes-256-gcm';
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const KEY_LENGTH_BYTES = 32; // 256 bits
export const SALT_LENGTH_BYTES = 32;
export const GCM_IV_LENGTH_BYTES = 12; // 96 bits standard for GCM
export const GCM_TAG_LENGTH_BYTES = 16; // 128 bits auth tag

export interface EncryptedEnvelope {
  algo: 'aes-256-gcm';
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // hex
}

/**
 * Derives a Key-Encryption Key (KEK) from a master password and salt using PBKDF2-SHA256.
 * Uses a minimum of 600,000 iterations for robust brute-force resistance.
 */
export function deriveKek(
  password: string,
  salt: Buffer,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  keyLen: number = KEY_LENGTH_BYTES
): Buffer {
  if (!password || password.length === 0) {
    throw new AppError('INVALID_INPUT', 'Password cannot be empty for key derivation');
  }
  if (!salt || salt.length < 16) {
    throw new AppError('INVALID_INPUT', 'Salt must be at least 16 bytes');
  }
  return crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256');
}

/**
 * Encrypts data using AES-256-GCM authenticated encryption.
 */
export function aesGcmEncrypt(data: Buffer | string, key: Buffer): EncryptedEnvelope {
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new AppError('SECURITY_VAULT_ERROR', `AES-256 key must be exactly ${KEY_LENGTH_BYTES} bytes`);
  }

  const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(AES_GCM_ALGORITHM, key, iv, {
    authTagLength: GCM_TAG_LENGTH_BYTES,
  });

  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algo: 'aes-256-gcm',
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM envelope and verifies the authentication tag.
 * Throws if the key is wrong or if the ciphertext/tag has been modified.
 */
export function aesGcmDecrypt(envelope: EncryptedEnvelope, key: Buffer): Buffer {
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new AppError('SECURITY_VAULT_ERROR', `AES-256 key must be exactly ${KEY_LENGTH_BYTES} bytes`);
  }

  try {
    const iv = Buffer.from(envelope.iv, 'hex');
    const tag = Buffer.from(envelope.tag, 'hex');
    const ciphertext = Buffer.from(envelope.ciphertext, 'hex');

    const decipher = crypto.createDecipheriv(AES_GCM_ALGORITHM, key, iv, {
      authTagLength: GCM_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new AppError(
      'SECURITY_VAULT_ERROR',
      'Decryption failed. The master key may be incorrect or ciphertext has been tampered with.'
    );
  }
}

const ENC_PREFIX = 'enc:v1:';

/**
 * Encrypts a plaintext string to a compact serialized string:
 * `enc:v1:<iv>:<tag>:<ciphertext>`
 */
export function encryptString(plaintext: string, key: Buffer): string {
  const env = aesGcmEncrypt(plaintext, key);
  return `${ENC_PREFIX}${env.iv}:${env.tag}:${env.ciphertext}`;
}

/**
 * Decrypts a compact serialized string (`enc:v1:<iv>:<tag>:<ciphertext>`).
 * If text does not have the encrypted prefix, returns it as-is.
 */
export function decryptString(text: string, key: Buffer): string {
  if (!text.startsWith(ENC_PREFIX)) {
    return text;
  }
  const parts = text.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new AppError('SECURITY_VAULT_ERROR', 'Invalid encrypted string format');
  }
  const [iv, tag, ciphertext] = parts;
  const env: EncryptedEnvelope = {
    algo: 'aes-256-gcm',
    iv,
    tag,
    ciphertext,
  };
  return aesGcmDecrypt(env, key).toString('utf8');
}

/**
 * Checks whether a string was encrypted with `encryptString`.
 */
export function isEncryptedString(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.startsWith(ENC_PREFIX);
}
