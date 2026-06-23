import {
  SessionTrustToken,
  RequestValidationToken,
  ChallengeResult,
  IntegrityStatus,
  FingerprintData,
} from '../utils/types';
import { CryptoUtils } from '../utils/crypto';
import { TokenBinding } from './token';

export class SessionTrustSystem {
  private sessionToken: SessionTrustToken | null = null;
  private requestTokens: Map<string, RequestValidationToken> = new Map();
  private tokenBinding: TokenBinding;
  private hmacKey: string;

  constructor(hmacKey: string = CryptoUtils.randomHex(32)) {
    this.hmacKey = hmacKey;
    this.tokenBinding = new TokenBinding(hmacKey);
  }

  async createSession(fingerprintHash: string, vmVersion: string): Promise<SessionTrustToken> {
    const token: SessionTrustToken = {
      sessionId: CryptoUtils.uuid(),
      fingerprintHash,
      vmVersion,
      integrityStatus: 'unknown',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000
    };

    token.signature = await CryptoUtils.hmacSHA256(
      this.hmacKey,
      this.serializeToken(token)
    );

    await this.tokenBinding.bindSession(token);
    this.sessionToken = token;

    return token;
  }

  async createRequestToken(challengeResults: ChallengeResult[]): Promise<RequestValidationToken> {
    const token: RequestValidationToken = {
      requestId: CryptoUtils.uuid(),
      challengeResults,
      timestamp: Date.now(),
      nonce: CryptoUtils.randomHex(16),
    };

    token.signature = await CryptoUtils.hmacSHA256(
      this.hmacKey,
      this.serializeRequestToken(token)
    );

    await this.tokenBinding.bindRequest(token);
    this.requestTokens.set(token.requestId, token);

    return token;
  }

  async validateSession(token: SessionTrustToken): Promise<boolean> {
    if (Date.now() > token.expiresAt) return false;

    const expectedSig = await CryptoUtils.hmacSHA256(
      this.hmacKey,
      this.serializeToken(token)
    );

    if (token.signature !== expectedSig) return false;

    return this.tokenBinding.verifySession(token);
  }

  async validateRequestToken(token: RequestValidationToken): Promise<boolean> {
    const expectedSig = await CryptoUtils.hmacSHA256(
      this.hmacKey,
      this.serializeRequestToken(token)
    );

    if (token.signature !== expectedSig) return false;

    return this.tokenBinding.verifyRequest(token);
  }

  async rotateSession(): Promise<SessionTrustToken | null> {
    if (!this.sessionToken) return null;

    const newToken = await this.createSession(
      this.sessionToken.fingerprintHash,
      this.sessionToken.vmVersion
    );

    this.sessionToken = newToken;
    return newToken;
  }

  getSessionToken(): SessionTrustToken | null {
    return this.sessionToken;
  }

  getRequestToken(id: string): RequestValidationToken | undefined {
    return this.requestTokens.get(id);
  }

  isSessionValid(): boolean {
    if (!this.sessionToken) return false;

    if (Date.now() > this.sessionToken.expiresAt) return false;

    return true;
  }

  invalidateSession(): void {
    this.sessionToken = null;
    this.requestTokens.clear();
  }

  private serializeToken(token: SessionTrustToken): string {
    return `${token.sessionId}|${token.fingerprintHash}|${token.vmVersion}|${token.integrityStatus}|${token.issuedAt}|${token.expiresAt}`;
  }

  private serializeRequestToken(token: RequestValidationToken): string {
    const results = token.challengeResults
      .map(r => `${r.challengeId}:${r.passed}:${r.score}`)
      .join(',');
    return `${token.requestId}|${results}|${token.timestamp}|${token.nonce}`;
  }
}
