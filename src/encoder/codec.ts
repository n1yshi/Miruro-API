import { BaseNEncoder } from './base-n';
import { XORCipher } from './xor';
import { EncoderOptions } from '../utils/types';

export class MultiLayerCodec {
  private baseNEncoder: BaseNEncoder;
  private xorCipher: XORCipher;
  private options: EncoderOptions;

  constructor(options: Partial<EncoderOptions> = {}) {
    const defaultAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const defaultKey = new Uint8Array(32);

    this.options = {
      alphabet: options.alphabet || defaultAlphabet,
      xorKey: options.xorKey || defaultKey,
      layers: options.layers || 2,
      validate: options.validate ?? true,
    };

    this.baseNEncoder = new BaseNEncoder(this.options.alphabet);
    this.xorCipher = new XORCipher(this.options.xorKey);
  }

  encode(bytecode: Uint8Array): string {
    let data = bytecode;

    for (let i = 0; i < this.options.layers; i++) {
      data = this.xorCipher.encrypt(data);
    }

    const encoded = this.baseNEncoder.encode(data);

    if (this.options.validate) {
      const validation = this.createValidation(encoded);
      return validation + encoded;
    }

    return encoded;
  }

  decode(encoded: string): Uint8Array {
    let data = encoded;

    if (this.options.validate) {
      data = encoded.slice(8);
    }

    let decoded = this.baseNEncoder.decode(data);

    for (let i = 0; i < this.options.layers; i++) {
      decoded = this.xorCipher.decrypt(decoded);
    }

    return decoded;
  }

  private createValidation(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private extractValidation(encoded: string): string {
    return encoded.slice(0, 8);
  }

  encodeBytecode(instructions: Uint8Array): string {
    return this.encode(instructions);
  }

  decodeBytecode(encoded: string): Uint8Array {
    return this.decode(encoded);
  }

  getOptions(): EncoderOptions {
    return { ...this.options };
  }
}
