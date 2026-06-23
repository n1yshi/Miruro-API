export class XORCipher {
  private key: Uint8Array;

  constructor(key: Uint8Array) {
    this.key = key;
  }

  encrypt(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ this.key[i % this.key.length];
    }
    return result;
  }

  decrypt(data: Uint8Array): Uint8Array {
    return this.encrypt(data);
  }

  static generateKey(length: number = 32): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  static encryptString(key: Uint8Array, data: string): string {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const cipher = new XORCipher(key);
    const encrypted = cipher.encrypt(dataBytes);
    return btoa(String.fromCharCode(...encrypted));
  }

  static decryptString(key: Uint8Array, data: string): string {
    const encrypted = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const cipher = new XORCipher(key);
    const decrypted = cipher.decrypt(encrypted);
    return new TextDecoder().decode(decrypted);
  }
}
