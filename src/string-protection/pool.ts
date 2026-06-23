export class StringPool {
  private pool: Map<number, string> = new Map();
  private encryptedPool: Map<number, string> = new Map();
  private decryptedCache: Map<number, string> = new Map();
  private lazyDecryption: boolean;

  constructor(lazyDecryption: boolean = true) {
    this.lazyDecryption = lazyDecryption;
  }

  addString(id: number, value: string, encrypted?: string): void {
    this.pool.set(id, value);
    if (encrypted) {
      this.encryptedPool.set(id, encrypted);
    }
  }

  getString(id: number, decryptFn?: (encrypted: string) => string): string {
    if (this.decryptedCache.has(id)) {
      return this.decryptedCache.get(id)!;
    }

    if (this.pool.has(id)) {
      const value = this.pool.get(id)!;

      if (this.lazyDecryption && this.encryptedPool.has(id) && decryptFn) {
        const encrypted = this.encryptedPool.get(id)!;
        const decrypted = decryptFn(encrypted);
        this.decryptedCache.set(id, decrypted);
        return decrypted;
      }

      return value;
    }

    throw new Error(`StringPool: String with id ${id} not found`);
  }

  hasString(id: number): boolean {
    return this.pool.has(id);
  }

  clearCache(): void {
    this.decryptedCache.clear();
  }

  getSize(): number {
    return this.pool.size;
  }

  getEncryptedSize(): number {
    return this.encryptedPool.size;
  }

  getCacheSize(): number {
    return this.decryptedCache.size;
  }
}
