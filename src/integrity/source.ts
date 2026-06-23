import { CryptoUtils } from '../utils/crypto';
import { IntegrityStatus } from '../utils/types';

interface SourceVerification {
  hashes: Map<string, string>;
  signatures: Map<string, string>;
  checksums: Map<string, string>;
}

export class SourceIntegrityVerifier {
  private verification: SourceVerification = {
    hashes: new Map(),
    signatures: new Map(),
    checksums: new Map()
  };

  private buildKey: string = '';

  setBuildKey(key: string): void {
    this.buildKey = key;
  }

  registerHash(id: string, hash: string): void {
    this.verification.hashes.set(id, hash);
  }

  registerSignature(id: string, signature: string): void {
    this.verification.signatures.set(id, signature);
  }

  registerChecksum(id: string, checksum: string): void {
    this.verification.checksums.set(id, checksum);
  }

  async verifyScript(scriptContent: string, expectedHash: string): Promise<boolean> {
    const actualHash = await CryptoUtils.sha256(scriptContent);
    return actualHash === expectedHash;
  }

  async verifyChunk(chunkData: Uint8Array, chunkId: string): Promise<boolean> {
    const expected = this.verification.checksums.get(chunkId);
    if (!expected) return false;

    const hash = await CryptoUtils.sha256(
      Array.from(chunkData).map(b => b.toString(16)).join('')
    );
    return hash === expected;
  }

  async generateHash(data: string): Promise<string> {
    return CryptoUtils.sha256(data);
  }

  async generateSignature(data: string): Promise<string> {
    if (!this.buildKey) return '';
    return CryptoUtils.hmacSHA256(this.buildKey, data);
  }

  verifyState(): IntegrityStatus {
    let validCount = 0;
    let totalCount = 0;

    for (const [id, hash] of this.verification.hashes) {
      totalCount++;
      if (hash.length > 0) validCount++;
    }

    for (const [id, signature] of this.verification.signatures) {
      totalCount++;
      if (signature.length > 0) validCount++;
    }

    for (const [id, checksum] of this.verification.checksums) {
      totalCount++;
      if (checksum.length > 0) validCount++;
    }

    if (totalCount === 0) return 'unknown';

    const ratio = validCount / totalCount;
    if (ratio >= 0.9) return 'clean';
    if (ratio >= 0.5) return 'unknown';
    return 'compromised';
  }

  getRegisteredCount(): { hashes: number; signatures: number; checksums: number } {
    return {
      hashes: this.verification.hashes.size,
      signatures: this.verification.signatures.size,
      checksums: this.verification.checksums.size
    };
  }
}
