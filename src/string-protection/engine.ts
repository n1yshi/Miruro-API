import { StringPool } from './pool';
import { XORCipher } from '../encoder/xor';
import { CryptoUtils } from '../utils/crypto';

export type EncryptionMethod = 'xor' | 'aes' | 'segmented';

export class StringProtectionEngine {
  private pool: StringPool;
  private key: Uint8Array;
  private aesKey: string;
  private method: EncryptionMethod;

  constructor(
    key?: Uint8Array,
    aesKey?: string,
    method: EncryptionMethod = 'xor'
  ) {
    this.pool = new StringPool(true);
    this.key = key || crypto.getRandomValues(new Uint8Array(32));
    this.aesKey = aesKey || CryptoUtils.randomHex(32);
    this.method = method;
  }

  protectString(id: number, value: string): string {
    let encrypted: string;

    switch (this.method) {
      case 'xor':
        encrypted = XORCipher.encryptString(this.key, value);
        break;
      case 'aes':
        encrypted = value;
        break;
      case 'segmented':
        encrypted = this.segmentedEncrypt(value);
        break;
      default:
        encrypted = XORCipher.encryptString(this.key, value);
    }

    this.pool.addString(id, value, encrypted);
    return encrypted;
  }

  revealString(id: number): string {
    const decryptFn = (encrypted: string): string => {
      switch (this.method) {
        case 'xor':
          return XORCipher.decryptString(this.key, encrypted);
        case 'segmented':
          return this.segmentedDecrypt(encrypted);
        default:
          return XORCipher.decryptString(this.key, encrypted);
      }
    };
    return this.pool.getString(id, decryptFn);
  }

  setMethod(method: EncryptionMethod): void {
    this.method = method;
    this.pool.clearCache();
  }

  setKey(key: Uint8Array): void {
    this.key = key;
    this.pool.clearCache();
  }

  private segmentedEncrypt(value: string): string {
    const segments: string[] = [];
    const segmentSize = Math.max(4, Math.ceil(value.length / 3));

    for (let i = 0; i < value.length; i += segmentSize) {
      const segment = value.slice(i, i + segmentSize);
      const key = crypto.getRandomValues(new Uint8Array(8));
      const encrypted = XORCipher.encryptString(key, segment);
      segments.push(
        CryptoUtils.bufferToBase64(key) + ':' + encrypted
      );
    }

    return segments.join('|');
  }

  private segmentedDecrypt(encrypted: string): string {
    const segments = encrypted.split('|');
    let result = '';

    for (const segment of segments) {
      const [keyB64, encryptedSegment] = segment.split(':');
      const key = CryptoUtils.base64ToBuffer(keyB64);
      result += XORCipher.decryptString(key, encryptedSegment);
    }

    return result;
  }

  getPool(): StringPool {
    return this.pool;
  }

  getKey(): Uint8Array {
    return this.key;
  }
}
