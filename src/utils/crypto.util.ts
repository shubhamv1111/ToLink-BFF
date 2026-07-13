import * as crypto from 'crypto';

/**
 * Reversible symmetric encryption (AES-256-GCM) for link-access passwords.
 *
 * Unlike the bcrypt hash (which is used for verifying access and is one-way),
 * this lets the link owner retrieve and share the original password. The key is
 * derived from a stable server secret, so the ciphertext is useless without it.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is recommended for GCM
const KEY_SALT = 'tolink-url-password-enc';
const PAYLOAD_SEPARATOR = '.';

export class CryptoUtil {
  private static cachedKey?: Buffer;

  private static getKey(): Buffer {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    const secret =
      process.env.URL_PASSWORD_ENC_KEY ||
      process.env.JWT_SECRET ||
      'tolink-default-dev-key';

    this.cachedKey = crypto.scryptSync(secret, KEY_SALT, 32);
    return this.cachedKey;
  }

  /**
   * Encrypt plaintext into a self-contained "iv.authTag.ciphertext" string.
   */
  static encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(PAYLOAD_SEPARATOR);
  }

  /**
   * Decrypt a payload produced by {@link encrypt}. Returns undefined if the
   * payload is malformed or the key/tag does not match.
   */
  static decrypt(payload: string): string | undefined {
    try {
      const [ivB64, tagB64, dataB64] = payload.split(PAYLOAD_SEPARATOR);
      if (!ivB64 || !tagB64 || !dataB64) {
        return undefined;
      }

      const iv = Buffer.from(ivB64, 'base64url');
      const authTag = Buffer.from(tagB64, 'base64url');
      const data = Buffer.from(dataB64, 'base64url');

      const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      return undefined;
    }
  }
}
