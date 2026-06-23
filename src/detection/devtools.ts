export class DevToolsDetector {
  private isDetected: boolean = false;
  private detectionConfidence: number = 0;
  private detections: string[] = [];

  detect(): { detected: boolean; confidence: number; methods: string[] } {
    this.detections = [];

    this.timingDetection();
    this.debuggerDetection();
    this.windowSizeDetection();
    this.consoleDetection();
    this.elementDetection();
    this.sourceUrlDetection();

    this.detectionConfidence = this.calculateConfidence();
    this.isDetected = this.detectionConfidence > 0.3;

    return {
      detected: this.isDetected,
      confidence: this.detectionConfidence,
      methods: this.detections
    };
  }

  private timingDetection(): void {
    try {
      const start = performance.now();
      debugger;
      const duration = performance.now() - start;

      if (duration > 100) {
        this.detections.push('timing_detection');
      }
    } catch {
      this.detections.push('timing_error');
    }
  }

  private debuggerDetection(): void {
    const start = Date.now();
    let count = 0;

    for (let i = 0; i < 1000; i++) {
      try {
        (function(){}).constructor('debugger;')();
        count++;
      } catch {
        break;
      }
    }

    const duration = Date.now() - start;
    if (duration > 500 || count < 100) {
      this.detections.push('debugger_detection');
    }
  }

  private windowSizeDetection(): void {
    if (typeof window === 'undefined') return;

    const widthThreshold = window.outerWidth - window.innerWidth > 200;
    const heightThreshold = window.outerHeight - window.innerHeight > 200;

    if (widthThreshold || heightThreshold) {
      this.detections.push('window_size_anomaly');
    }

    if ((window as any).Firebug && (window as any).Firebug.chrome && (window as any).Firebug.chrome.isInitialized) {
      this.detections.push('firebug_detected');
    }
  }

  private consoleDetection(): void {
    if (typeof console === 'undefined') return;

    try {
      const c = console as any;
      if (c._commandLineAPI || c._inspectorCommandLineAPI) {
        this.detections.push('console_api_detected');
      }
    } catch {
    }

    try {
      console.log('%c', 'font-size: 1px;');
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el instanceof HTMLDivElement &&
            el.style?.fontSize === '1px' &&
            el.textContent === '') {
          this.detections.push('console_trick_detected');
          break;
        }
      }
    } catch {
    }
  }

  private elementDetection(): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    const img = new Image();
    Object.defineProperty(img, 'id', {
      get: () => {
        this.detections.push('element_getter_detection');
        return 'detected';
      }
    });

    try {
      body.appendChild(img);
      body.removeChild(img);
    } catch {
    }
  }

  private sourceUrlDetection(): void {
    try {
      const stack = new Error().stack;
      if (stack) {
        const filtered = stack
          .split('\n')
          .filter(line => line.includes('chrome-extension://') || line.includes('moz-extension://'));

        if (filtered.length > 0) {
          this.detections.push('extension_source_detected');
        }
      }
    } catch {
    }
  }

  private calculateConfidence(): number {
    if (this.detections.length === 0) return 0;

    const weights: Record<string, number> = {
      'timing_detection': 0.4,
      'timing_error': 0.2,
      'debugger_detection': 0.7,
      'window_size_anomaly': 0.3,
      'firebug_detected': 0.8,
      'console_api_detected': 0.5,
      'console_trick_detected': 0.4,
      'element_getter_detection': 0.6,
      'extension_source_detected': 0.3,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const detection of this.detections) {
      const w = weights[detection] || 0.3;
      weightedSum += w;
      totalWeight += 1;
    }

    return Math.min(1, weightedSum / Math.max(1, totalWeight));
  }

  isDevToolsOpen(): boolean {
    return this.isDetected;
  }

  getConfidence(): number {
    return this.detectionConfidence;
  }
}
