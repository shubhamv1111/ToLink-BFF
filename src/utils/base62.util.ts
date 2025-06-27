import * as crypto from 'crypto';

export class Base62Util {
  // Base62 character set (0-9, A-Z, a-z) - follows Base64 ordering for consistency
  private static readonly BASE62_CHARS =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  /**
   * Generate a cryptographically secure random short code
   * This generates non-guessable, random short codes for better security
   * @param length - The length of the short code (default: 7 characters)
   * @returns Cryptographically secure random Base62 encoded string
   */
  static generateSecureRandomShortCode(length: number = 7): string {
    let result = '';

    for (let i = 0; i < length; i++) {
      // Generate random bytes and use modulo to get index
      const randomBytes = crypto.randomBytes(1);
      const randomIndex = randomBytes[0] % this.BASE62_CHARS.length;
      result += this.BASE62_CHARS[randomIndex];
    }

    return result;
  }

  /**
   * Generate a random short code using Math.random (faster but less secure)
   * For high-performance scenarios where cryptographic security is not critical
   * @param length - The length of the short code (default: 7 characters)
   * @returns Random Base62 encoded string
   */
  static generateRandomShortCode(length: number = 7): string {
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * this.BASE62_CHARS.length);
      result += this.BASE62_CHARS[randomIndex];
    }

    return result;
  }

  /**
   * Generate short code from hash (for consistent hashing if needed)
   * Useful for generating deterministic short codes from URLs
   * @param input - The input string to hash
   * @param length - The length of the short code (default: 7 characters)
   * @returns Base62 encoded hash
   */
  static generateHashBasedShortCode(input: string, length: number = 7): string {
    // Create SHA-256 hash of the input for better distribution
    const hash = crypto.createHash('sha256').update(input).digest('hex');

    // Convert hex to number and then to Base62
    let result = '';
    let hashNumber = BigInt('0x' + hash.substring(0, 14)); // Use first 14 hex chars

    if (hashNumber === BigInt(0)) {
      return this.BASE62_CHARS[0].repeat(length);
    }

    while (hashNumber > 0 && result.length < length) {
      result = this.BASE62_CHARS[Number(hashNumber % BigInt(62))] + result;
      hashNumber = hashNumber / BigInt(62);
    }

    // Pad to desired length with random characters to avoid patterns
    while (result.length < length) {
      const randomIndex = Math.floor(Math.random() * this.BASE62_CHARS.length);
      result = this.BASE62_CHARS[randomIndex] + result;
    }

    return result.substring(0, length);
  }

  /**
   * Validate if a string is a valid Base62 encoded string
   * @param shortCode - The string to validate
   * @returns true if valid Base62, false otherwise
   */
  static isValidBase62(shortCode: string): boolean {
    if (!shortCode || shortCode.length === 0) {
      return false;
    }

    for (const char of shortCode) {
      if (this.BASE62_CHARS.indexOf(char) === -1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate multiple unique short codes at once
   * Useful for batch operations or pre-generating codes
   * @param count - Number of codes to generate
   * @param length - Length of each code
   * @returns Array of unique short codes
   */
  static generateMultipleUniqueCodes(
    count: number,
    length: number = 7,
  ): string[] {
    const codes = new Set<string>();

    while (codes.size < count) {
      const code = this.generateSecureRandomShortCode(length);
      codes.add(code);
    }

    return Array.from(codes);
  }

  /**
   * Decode a Base62 string back to a number (for legacy compatibility)
   * @param shortCode - The Base62 string to decode
   * @returns The decoded number
   */
  static decode(shortCode: string): number {
    let result = 0;
    const base = 62;

    for (let i = 0; i < shortCode.length; i++) {
      const char = shortCode[i];
      const charIndex = this.BASE62_CHARS.indexOf(char);

      if (charIndex === -1) {
        throw new Error(`Invalid character in short code: ${char}`);
      }

      result = result * base + charIndex;
    }

    return result;
  }

  /**
   * Get statistics about Base62 character space
   * @param length - The length of short codes
   * @returns Object with statistics
   */
  static getCapacityStats(length: number = 7): {
    totalPossible: bigint;
    humanReadable: string;
  } {
    const totalPossible = BigInt(62) ** BigInt(length);

    let humanReadable: string;
    if (totalPossible < BigInt(1000)) {
      humanReadable = totalPossible.toString();
    } else if (totalPossible < BigInt(1000000)) {
      humanReadable = (Number(totalPossible) / 1000).toFixed(1) + 'K';
    } else if (totalPossible < BigInt(1000000000)) {
      humanReadable = (Number(totalPossible) / 1000000).toFixed(1) + 'M';
    } else if (totalPossible < BigInt(1000000000000)) {
      humanReadable = (Number(totalPossible) / 1000000000).toFixed(1) + 'B';
    } else {
      humanReadable = (Number(totalPossible) / 1000000000000).toFixed(1) + 'T';
    }

    return { totalPossible, humanReadable };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateSecureRandomShortCode instead
   */
  static generateShortCode(counter: number): string {
    console.warn(
      'generateShortCode is deprecated. Use generateSecureRandomShortCode for better security.',
    );
    return this.generateSecureRandomShortCode(7);
  }
}
