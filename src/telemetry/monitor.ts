import { TelemetryEvent, TelemetryEventType } from '../utils/types';
import { CryptoUtils } from '../utils/crypto';

interface TelemetryConfig {
  enabled: boolean;
  maxEvents: number;
  flushInterval: number;
  gdprCompliant: boolean;
  storageKey: string;
}

export class TelemetryMonitor {
  private events: TelemetryEvent[] = [];
  private config: TelemetryConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private eventCount: number = 0;

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = {
      enabled: true,
      maxEvents: 500,
      flushInterval: 30000,
      gdprCompliant: true,
      storageKey: 'aegis_telemetry',
      ...config
    };

    if (this.config.enabled) {
      this.startFlushTimer();
      this.restoreFromStorage();
    }
  }

  track(
    type: TelemetryEventType,
    data: Record<string, unknown>,
    level: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): void {
    if (!this.config.enabled) return;

    const event: TelemetryEvent = {
      id: CryptoUtils.uuid(),
      type,
      timestamp: Date.now(),
      data: this.sanitizeData(data),
      level
    };

    this.events.push(event);
    this.eventCount++;

    if (this.events.length >= this.config.maxEvents) {
      this.flush();
    }
  }

  trackIntegrityViolation(details: string, severity: string): void {
    this.track('integrity_violation', { details, severity }, severity === 'critical' ? 'critical' : 'warning');
  }

  trackChallengeCompleted(challengeId: string, result: string, duration: number): void {
    this.track('challenge_completed', { challengeId, result, duration }, 'info');
  }

  trackChallengeFailed(challengeId: string, reason: string): void {
    this.track('challenge_failed', { challengeId, reason }, 'warning');
  }

  trackRuntimeError(error: string, context: string): void {
    this.track('runtime_error', { error, context }, 'error');
  }

  trackRiskScoreChange(oldScore: number, newScore: number, level: string): void {
    this.track('risk_score_change', { oldScore, newScore, level, delta: newScore - oldScore }, 'info');
  }

  trackSessionCreated(sessionId: string): void {
    this.track('session_created', { sessionId }, 'info');
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    if (!this.config.gdprCompliant) return data;

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['email', 'password', 'token', 'ssn', 'credit', 'phone', 'address'];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  flush(): void {
    if (this.events.length === 0) return;

    const batch = this.events.splice(0, this.events.length);

    this.persistToStorage(batch);

    try {
      const payload = JSON.stringify(batch, (key, value) =>
        typeof value === 'bigint' ? value.toString() + 'n' : value
      );
    } catch {
    }
  }

  private startFlushTimer(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  private persistToStorage(events: TelemetryEvent[]): void {
    try {
      const existing = localStorage.getItem(this.config.storageKey);
      const stored: TelemetryEvent[] = existing ? JSON.parse(existing) : [];
      stored.push(...events);
      const trimmed = stored.slice(-1000);
      localStorage.setItem(this.config.storageKey, JSON.stringify(trimmed));
    } catch {
    }
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const events: TelemetryEvent[] = JSON.parse(stored);
        this.events.push(...events.slice(-100));
        localStorage.removeItem(this.config.storageKey);
      }
    } catch {
    }
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventCount(): number {
    return this.eventCount;
  }

  getEventsByType(type: TelemetryEventType): TelemetryEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getEventsByLevel(level: string): TelemetryEvent[] {
    return this.events.filter(e => e.level === level);
  }

  enable(): void {
    this.config.enabled = true;
    this.startFlushTimer();
  }

  disable(): void {
    this.config.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  destroy(): void {
    this.disable();
    this.events = [];
    this.eventCount = 0;

    try {
      localStorage.removeItem(this.config.storageKey);
    } catch {
    }
  }
}
