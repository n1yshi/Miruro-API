import { ServerValidator, ValidationResult } from './validator';

export interface ServerRequest {
  headers: Record<string, string>;
  body?: string;
  ip?: string;
  url?: string;
  method?: string;
}

export interface ServerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface MiddlewareOptions {
  apiKey: string;
  requireValidation: boolean;
  blockHighRisk: boolean;
  challengeOnSuspicious: boolean;
  rateLimit: number;
  rateLimitWindow: number;
}

export class AegisMiddleware {
  private validator: ServerValidator;
  private options: MiddlewareOptions;
  private ipRequests: Map<string, number[]> = new Map();
  private blockedIps: Set<string> = new Set();

  constructor(options: Partial<MiddlewareOptions> = {}) {
    const apiKey = options.apiKey || 'aegis-default-key';

    this.validator = new ServerValidator(apiKey);
    this.options = {
      apiKey,
      requireValidation: true,
      blockHighRisk: true,
      challengeOnSuspicious: true,
      rateLimit: 100,
      rateLimitWindow: 60000,
      ...options
    };
  }

  async processRequest(req: ServerRequest): Promise<{ action: 'allow' | 'challenge' | 'block'; result: ValidationResult; response?: ServerResponse }> {
    if (this.blockedIps.has(req.ip || '')) {
      return {
        action: 'block',
        result: this.getBlockedResult(),
        response: this.blockResponse()
      };
    }

    if (this.isRateLimited(req.ip || '')) {
      return {
        action: 'block',
        result: this.getRateLimitedResult(),
        response: this.rateLimitResponse()
      };
    }

    const validationResult = await this.validator.validateHeaders(req.headers);

    if (!validationResult.valid && this.options.requireValidation) {
      if (this.options.blockHighRisk && validationResult.riskScore > 60) {
        return {
          action: 'block',
          result: validationResult,
          response: this.blockResponse()
        };
      }

      if (this.options.challengeOnSuspicious && validationResult.riskScore > 30) {
        return {
          action: 'challenge',
          result: validationResult,
          response: this.challengeResponse()
        };
      }

      return {
        action: 'block',
        result: validationResult,
        response: this.denyResponse()
      };
    }

    this.trackRequest(req.ip || '');
    return {
      action: 'allow',
      result: validationResult
    };
  }

  private isRateLimited(ip: string): boolean {
    if (!ip) return false;

    const now = Date.now();
    const requests = this.ipRequests.get(ip) || [];
    const recent = requests.filter(t => now - t < this.options.rateLimitWindow);

    if (recent.length >= this.options.rateLimit) {
      this.blockedIps.add(ip);
      return true;
    }

    return false;
  }

  private trackRequest(ip: string): void {
    if (!ip) return;

    const requests = this.ipRequests.get(ip) || [];
    requests.push(Date.now());

    const cutoff = Date.now() - this.options.rateLimitWindow;
    this.ipRequests.set(ip, requests.filter(t => t > cutoff));
  }

  blockIp(ip: string): void {
    this.blockedIps.add(ip);
  }

  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
  }

  isBlocked(ip: string): boolean {
    return this.blockedIps.has(ip);
  }

  private blockResponse(): ServerResponse {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Aegis-Blocked': 'true'
      },
      body: JSON.stringify({
        error: 'Access denied',
        code: 'AEGIS_BLOCKED',
        message: 'Your request has been blocked by security policy'
      })
    };
  }

  private challengeResponse(): ServerResponse {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'X-Aegis-Challenge': 'required'
      },
      body: JSON.stringify({
        error: 'Challenge required',
        code: 'AEGIS_CHALLENGE',
        message: 'Additional verification is required',
        challenge: {
          type: 'fingerprint',
          difficulty: 2
        }
      })
    };
  }

  private denyResponse(): ServerResponse {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Invalid request',
        code: 'AEGIS_INVALID',
        message: 'Request validation failed'
      })
    };
  }

  private rateLimitResponse(): ServerResponse {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60'
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'AEGIS_RATE_LIMIT',
        message: 'Too many requests. Please try again later.'
      })
    };
  }

  private getBlockedResult(): ValidationResult {
    return {
      valid: false,
      sessionValid: false,
      requestValid: false,
      signatureValid: false,
      riskScore: 100,
      errors: ['IP is blocked']
    };
  }

  private getRateLimitedResult(): ValidationResult {
    return {
      valid: false,
      sessionValid: false,
      requestValid: false,
      signatureValid: false,
      riskScore: 100,
      errors: ['Rate limit exceeded']
    };
  }

  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [ip, requests] of this.ipRequests) {
      const recent = requests.filter(t => t > oneHourAgo);
      if (recent.length === 0) {
        this.ipRequests.delete(ip);
      } else {
        this.ipRequests.set(ip, recent);
      }
    }

    this.validator.cleanup();
  }

  getValidator(): ServerValidator {
    return this.validator;
  }
}
