import { DetectionResult, DetectionSignal } from '../utils/types';

export class AntiBotDetection {
  private signals: DetectionSignal[] = [];
  private navigatorCache: Record<string, unknown> | null = null;

  detect(): DetectionResult {
    this.signals = [];
    this.collectNavigatorSignals();
    this.collectBrowserSignals();
    this.collectPermissionSignals();
    this.collectTimingSignals();

    const score = this.calculateScore();
    const confidence = this.calculateConfidence();
    const isAutomated = score > 0.5;

    return {
      isAutomated,
      confidence,
      signals: [...this.signals],
      score
    };
  }

  private collectNavigatorSignals(): void {
    if (typeof navigator === 'undefined') return;

    this.addSignal('webdriver', Boolean((navigator as any).webdriver), 0.9);

    const plugins = navigator.plugins;
    this.addSignal('plugins_length', plugins?.length ?? 0, 0.3);

    const mimeTypes = navigator.mimeTypes;
    this.addSignal('mimeTypes_length', mimeTypes?.length ?? 0, 0.3);

    const languages = navigator.languages;
    this.addSignal('languages', languages, 0.2);

    const hardwareConcurrency = navigator.hardwareConcurrency;
    this.addSignal('hardwareConcurrency', hardwareConcurrency, 0.1);

    const deviceMemory = (navigator as any).deviceMemory;
    this.addSignal('deviceMemory', deviceMemory, 0.1);

    const maxTouchPoints = navigator.maxTouchPoints;
    this.addSignal('maxTouchPoints', maxTouchPoints, 0.2);

    if ((navigator as any).userAgentData) {
      this.addSignal('userAgentData', true, 0.1);
    }
  }

  private collectBrowserSignals(): void {
    if (typeof window === 'undefined') return;

    const chrome = (window as any).chrome;
    this.addSignal('window_chrome', !!chrome, 0.1);

    this.addSignal('chrome_runtime', !!(chrome?.runtime), 0.2);
    this.addSignal('chrome_webstore', !!(chrome?.loadTimes), 0.2);

    const outerWidth = window.outerWidth;
    const outerHeight = window.outerHeight;
    if (outerWidth === 0 || outerHeight === 0) {
      this.addSignal('zero_window_dimensions', true, 0.7);
    }

    const screen = window.screen;
    if (screen) {
      this.addSignal('screen_width', screen.width, 0.1);
      this.addSignal('screen_height', screen.height, 0.1);
    }

    if ((window as any).callPhantom || (window as any)._phantom) {
      this.addSignal('phantomjs_detected', true, 1.0);
    }
  }

  private collectPermissionSignals(): void {
    if (typeof navigator === 'undefined') return;

    const permissions = navigator.permissions;
    if (!permissions) {
      this.addSignal('permissions_api_missing', true, 0.5);
      return;
    }

    const permissionNames = ['geolocation', 'notifications', 'camera', 'microphone'];
    for (const name of permissionNames) {
      permissions.query({ name: name as PermissionName })
        .then(() => {})
        .catch(() => {
          this.addSignal(`permission_${name}_error`, true, 0.2);
        });
    }
  }

  private collectTimingSignals(): void {
    if (typeof performance === 'undefined') return;

    const perf = performance;

    this.addSignal('performance_timing', !!perf.timing, 0.1);

    perf.mark('aegis_detect_start');
    perf.mark('aegis_detect_end');
    perf.measure('aegis_detect', 'aegis_detect_start', 'aegis_detect_end');

    try {
      perf.getEntriesByType('measure');
      this.addSignal('performance_api', true, 0.05);
    } catch {
      this.addSignal('performance_api_blocked', true, 0.3);
    }

    const now1 = performance.now();
    const now2 = performance.now();
    const diff = now2 - now1;

    if (diff < 0.001 || diff > 100) {
      this.addSignal('timing_anomaly', diff, 0.6);
    }
  }

  private addSignal(name: string, value: unknown, weight: number): void {
    const detected = typeof value === 'boolean'
      ? value as boolean
      : value !== null && value !== undefined && value !== 0 && value !== '';

    this.signals.push({ name, detected, value, weight });
  }

  private calculateScore(): number {
    if (this.signals.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of this.signals) {
      if (signal.detected) {
        weightedSum += signal.weight;
      }
      totalWeight += signal.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateConfidence(): number {
    const highWeightSignals = this.signals.filter(s => s.weight >= 0.7 && s.detected);
    const mediumSignals = this.signals.filter(s => s.weight >= 0.4 && s.weight < 0.7 && s.detected);

    const highConf = highWeightSignals.length * 0.3;
    const midConf = mediumSignals.length * 0.15;

    return Math.min(1, highConf + midConf);
  }

  getSignal(name: string): DetectionSignal | undefined {
    return this.signals.find(s => s.name === name);
  }

  getAllSignals(): DetectionSignal[] {
    return [...this.signals];
  }
}
