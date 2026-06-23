export class BaseNEncoder {
  private alphabet: string;
  private base: number;
  private charMap: Map<string, number>;

  constructor(alphabet?: string) {
    this.alphabet = alphabet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    this.base = this.alphabet.length;
    this.charMap = new Map();
    for (let i = 0; i < this.alphabet.length; i++) {
      this.charMap.set(this.alphabet[i], i);
    }
  }

  encode(data: Uint8Array): string {
    if (data.length === 0) return '';

    let leadingZeros = 0;
    for (const byte of data) {
      if (byte === 0) leadingZeros++;
      else break;
    }

    let num = 0n;
    for (const byte of data) {
      num = (num << 8n) | BigInt(byte);
    }

    let result = '';
    const base = BigInt(this.base);
    while (num > 0n) {
      const remainder = Number(num % base);
      result = this.alphabet[remainder] + result;
      num = num / base;
    }

    for (let i = 0; i < leadingZeros; i++) {
      result = this.alphabet[0] + result;
    }

    const lenHex = data.length.toString(16).padStart(4, '0');
    return lenHex + result;
  }

  decode(encoded: string): Uint8Array {
    if (encoded.length < 4) return new Uint8Array(0);

    const lenHex = encoded.slice(0, 4);
    const originalLen = parseInt(lenHex, 16);
    const body = encoded.slice(4);

    if (body.length === 0) return new Uint8Array(originalLen);

    let num = 0n;
    const base = BigInt(this.base);

    let leadingZeros = 0;
    for (const char of body) {
      if (this.charMap.get(char) === 0) leadingZeros++;
      else break;
    }

    for (const char of body) {
      const index = this.charMap.get(char);
      if (index === undefined) {
        throw new Error(`Invalid character '${char}' in encoded data`);
      }
      num = num * base + BigInt(index);
    }

    if (num === 0n) {
      return new Uint8Array(originalLen);
    }

    const bytes: number[] = [];
    while (num > 0n) {
      bytes.unshift(Number(num & 0xFFn));
      num = num >> 8n;
    }

    while (bytes.length < originalLen) {
      bytes.unshift(0);
    }

    return new Uint8Array(bytes);
  }

  getAlphabet(): string {
    return this.alphabet;
  }

  getBase(): number {
    return this.base;
  }

  static generateAlphabet(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    const shuffled = chars.split('').sort(() => Math.random() - 0.5);
    return shuffled.slice(0, length).join('');
  }
}
