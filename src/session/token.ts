import { SessionTrustToken, RequestValidationToken } from '../utils/types';
import { CryptoUtils } from '../utils/crypto';

interface BoundSession {
  sessionId: string;
  fingerprintHash: string;
  boundAt: number;
  requestIds: Set<string>;
}

export class TokenBinding {
  private hmacKey: string;
  private boundSessions: Map<string, BoundSession> = new Map();
  private boundRequests: Map<string, RequestValidationToken> = new Map();
  private nonceStore: Set<string> = new Set();

  constructor(hmacKey: string) {
    this.hmacKey = hmacKey;
  }

  async bindSession(token: SessionTrustToken): Promise<void> {
    const binding: BoundSession = {
      sessionId: token.sessionId,
      fingerprintHash: token.fingerprintHash,
      boundAt: Date.now(),
      requestIds: new Set()
    };

    this.boundSessions.set(token.sessionId, binding);

    const bindingData = this.createBindingData(token);
    const bindingSig = await CryptoUtils.hmacSHA256(
      this.hmacKey,
      bindingData
    );
  }

  async bindRequest(token: RequestValidationToken): Promise<void> {
    this.boundRequests.set(token.requestId, token);
    this.nonceStore.add(token.nonce);

    for (const session of this.boundSessions.values()) {
      session.requestIds.add(token.requestId);
    }
  }

  async verifySession(token: SessionTrustToken): Promise<boolean> {
    const binding = this.boundSessions.get(token.sessionId);
    if (!binding) return false;

    if (binding.fingerprintHash !== token.fingerprintHash) return false;

    return true;
  }

  async verifyRequest(token: RequestValidationToken): Promise<boolean> {
    if (this.nonceStore.has(token.nonce)) {
      const existing = this.boundRequests.get(token.requestId);
      if (existing && existing.nonce === token.nonce) {
        return true;
      }
    }

    if (this.hasNonceBeenUsed(token.nonce)) {
      return false;
    }

    const age = Date.now() - token.timestamp;
    if (age > 60000) return false;

    this.nonceStore.add(token.nonce);
    return true;
  }

  private hasNonceBeenUsed(nonce: string): boolean {
    return this.nonceStore.has(nonce);
  }

  private createBindingData(token: SessionTrustToken): string {
    return [
      token.sessionId,
      token.fingerprintHash,
      token.issuedAt,
      token.expiresAt
    ].join('|');
  }

  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;

    for (const [id, binding] of this.boundSessions) {
      if (binding.boundAt < oneHourAgo) {
        this.boundSessions.delete(id);
      }
    }

    for (const [id, token] of this.boundRequests) {
      if (Date.now() - token.timestamp > 3600000) {
        this.boundRequests.delete(id);
      }
    }
  }

  getSessionCount(): number {
    return this.boundSessions.size;
  }

  getRequestCount(): number {
    return this.boundRequests.size;
  }
}
