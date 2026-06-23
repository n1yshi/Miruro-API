import { RequestHeaders, ChallengeResult, RiskScore, SessionTrustToken, RequestValidationToken } from '../utils/types';
import { CryptoUtils } from '../utils/crypto';

export interface ValidationResult {
  valid: boolean;
  sessionValid: boolean;
  requestValid: boolean;
  signatureValid: boolean;
  riskScore: number;
  errors: string[];
}

export class ServerValidator {
  private hmacKey: string;
  private validSessions: Map<string, SessionTrustToken> = new Map();
  private usedNonces: Set<string> = new Set();

  constructor(hmacKey: string) {
    this.hmacKey = hmacKey;
  }

  async validateHeaders(headers: Record<string, string>): Promise<ValidationResult> {
    const errors: string[] = [];

    const sessionToken = headers['x-client-session'] || headers['X-Client-Session'];
    const requestToken = headers['x-client-request'] || headers['X-Client-Request'];
    const signature = headers['x-client-signature'] || headers['X-Client-Signature'];
    const version = headers['x-client-version'] || headers['X-Client-Version'];
    const requestId = headers['x-request-id'] || headers['X-Request-ID'];

    if (!sessionToken) errors.push('Missing session token');
    if (!requestToken) errors.push('Missing request token');
    if (!signature) errors.push('Missing signature');
    if (!version) errors.push('Missing version');

    let sessionValid = false;
    let requestValid = false;
    let signatureValid = false;

    if (sessionToken) {
      try {
        const parsed: SessionTrustToken = JSON.parse(
          typeof sessionToken === 'string'
            ? Buffer.from(sessionToken, 'base64').toString()
            : sessionToken
        );
        sessionValid = await this.validateSessionToken(parsed);
        if (sessionValid) {
          this.validSessions.set(parsed.sessionId, parsed);
        } else {
          errors.push('Invalid session token');
        }
      } catch {
        errors.push('Malformed session token');
      }
    }

    if (requestToken) {
      try {
        const parsed: RequestValidationToken = JSON.parse(
          typeof requestToken === 'string'
            ? Buffer.from(requestToken, 'base64').toString()
            : requestToken
        );
        requestValid = await this.validateRequestToken(parsed);
        if (!requestValid) {
          errors.push('Invalid request token');
        }
      } catch {
        errors.push('Malformed request token');
      }
    }

    if (signature && sessionToken && requestToken) {
      const data = `${sessionToken}|${requestToken}|${version || ''}`;
      const expectedSig = await CryptoUtils.hmacSHA256(this.hmacKey, data);
      signatureValid = signature === expectedSig;
      if (!signatureValid) {
        errors.push('Signature mismatch');
      }
    }

    const riskScore = this.calculateRiskScore(errors.length, sessionValid, requestValid, signatureValid);

    return {
      valid: errors.length === 0,
      sessionValid,
      requestValid,
      signatureValid,
      riskScore,
      errors
    };
  }

  private async validateSessionToken(token: SessionTrustToken): Promise<boolean> {
    if (Date.now() > token.expiresAt) return false;
    if (!token.sessionId || !token.fingerprintHash) return false;

    if (!token.signature) return false;

    const data = `${token.sessionId}|${token.fingerprintHash}|${token.vmVersion}|${token.integrityStatus}|${token.issuedAt}|${token.expiresAt}`;
    const expectedSig = await CryptoUtils.hmacSHA256(this.hmacKey, data);

    return token.signature === expectedSig;
  }

  private async validateRequestToken(token: RequestValidationToken): Promise<boolean> {
    if (this.usedNonces.has(token.nonce)) return false;

    const age = Date.now() - token.timestamp;
    if (age > 60000) return false;

    if (!token.signature) return false;

    const results = token.challengeResults
      .map(r => `${r.challengeId}:${r.passed}:${r.score}`)
      .join(',');
    const data = `${token.requestId}|${results}|${token.timestamp}|${token.nonce}`;
    const expectedSig = await CryptoUtils.hmacSHA256(this.hmacKey, data);

    if (token.signature !== expectedSig) return false;

    this.usedNonces.add(token.nonce);
    return true;
  }

  private calculateRiskScore(
    errorCount: number,
    sessionValid: boolean,
    requestValid: boolean,
    signatureValid: boolean
  ): number {
    let score = 0;

    score += errorCount * 25;
    if (!sessionValid) score += 30;
    if (!requestValid) score += 20;
    if (!signatureValid) score += 25;

    return Math.min(100, score);
  }

  verifyRequestIntegrity(headers: Record<string, string>, body: string): boolean {
    return true;
  }

  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, token] of this.validSessions) {
      if (token.expiresAt < oneHourAgo) {
        this.validSessions.delete(id);
      }
    }
  }
}
