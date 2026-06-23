import {
  BehavioralData,
  BehavioralScore,
  MouseEventData,
  ScrollEventData,
  KeyEventData,
  TouchEventData,
  FocusEventData,
} from '../utils/types';

export class BehavioralAnalyzer {
  private data: BehavioralData = {
    mouseMovements: [],
    scrollPatterns: [],
    keyPresses: [],
    touchEvents: [],
    focusChanges: []
  };

  private maxSamples: number = 1000;
  private isCollecting: boolean = false;

  startCollection(): void {
    if (typeof window === 'undefined') return;
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.attachListeners();
  }

  stopCollection(): void {
    this.isCollecting = false;
  }

  private attachListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    document.addEventListener('touchstart', this.handleTouch.bind(this));
    document.addEventListener('focus', this.handleFocus.bind(this), true);
    document.addEventListener('blur', this.handleBlur.bind(this), true);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.data.mouseMovements.length >= this.maxSamples) return;

    const last = this.data.mouseMovements[this.data.mouseMovements.length - 1];
    const velocity = last
      ? Math.sqrt(
          Math.pow(event.clientX - last.x, 2) + Math.pow(event.clientY - last.y, 2)
        ) / (event.timeStamp - last.timestamp)
      : 0;

    const acceleration = last && this.data.mouseMovements.length > 1
      ? Math.abs(velocity - last.velocity) / (event.timeStamp - last.timestamp)
      : 0;

    this.data.mouseMovements.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
      velocity,
      acceleration
    });
  }

  private handleScroll(event: Event): void {
    if (this.data.scrollPatterns.length >= this.maxSamples) return;

    this.data.scrollPatterns.push({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: Date.now()
    });
  }

  private lastKeyTime: number = 0;
  private handleKeyDown(event: KeyboardEvent): void {
    const now = Date.now();
    this.data.keyPresses.push({
      key: event.key,
      timestamp: now,
      duration: now - this.lastKeyTime
    });
    this.lastKeyTime = now;
  }

  private handleKeyUp(event: KeyboardEvent): void {
  }

  private handleTouch(event: TouchEvent): void {
    if (this.data.touchEvents.length >= this.maxSamples) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.data.touchEvents.push({
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0,
        timestamp: Date.now()
      });
    }
  }

  private handleFocus(event: FocusEvent): void {
    this.data.focusChanges.push({
      type: 'focus',
      timestamp: Date.now()
    });
  }

  private handleBlur(event: FocusEvent): void {
    this.data.focusChanges.push({
      type: 'blur',
      timestamp: Date.now()
    });
  }

  analyze(): BehavioralScore {
    const interactionScore = this.calculateInteractionScore();
    const humanConfidenceScore = this.calculateHumanConfidence();
    const consistencyScore = this.calculateConsistencyScore();

    const overallScore = (interactionScore * 0.3) +
      (humanConfidenceScore * 0.4) +
      (consistencyScore * 0.3);

    return {
      interactionScore,
      humanConfidenceScore,
      consistencyScore,
      overallScore
    };
  }

  private calculateInteractionScore(): number {
    const mouseCount = this.data.mouseMovements.length;
    const scrollCount = this.data.scrollPatterns.length;
    const keyCount = this.data.keyPresses.length;

    if (mouseCount === 0 && scrollCount === 0 && keyCount === 0) {
      return 0;
    }

    const score = Math.min(1, (mouseCount * 0.01) + (scrollCount * 0.02) + (keyCount * 0.05));
    return score;
  }

  private calculateHumanConfidence(): number {
    if (this.data.mouseMovements.length < 5) {
      return 0.3;
    }

    const velocities = this.data.mouseMovements
      .filter(m => m.velocity > 0)
      .map(m => m.velocity);

    if (velocities.length === 0) return 0.3;

    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - avgVelocity, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 10) return 0.1;
    if (stdDev > 1000) return 0.9;

    const accelerationVariation = this.data.mouseMovements
      .filter(m => m.acceleration > 0)
      .map(m => m.acceleration);

    if (accelerationVariation.length === 0) return 0.5;

    const avgAccel = accelerationVariation.reduce((a, b) => a + b, 0) / accelerationVariation.length;
    const accelVariance = accelerationVariation.reduce((a, b) => a + Math.pow(b - avgAccel, 2), 0) / accelerationVariation.length;

    if (accelVariance < 1) return 0.2;

    if (this.data.keyPresses.length > 0) {
      const keyDurations = this.data.keyPresses.map(k => k.duration);
      const avgDuration = keyDurations.reduce((a, b) => a + b, 0) / keyDurations.length;
      if (avgDuration > 10) return 0.7;
    }

    return 0.5;
  }

  private calculateConsistencyScore(): number {
    const totalEvents = this.data.mouseMovements.length +
      this.data.scrollPatterns.length +
      this.data.keyPresses.length +
      this.data.touchEvents.length;

    if (totalEvents === 0) return 0.5;

    const timeWindow = this.getTimeWindow();
    if (timeWindow === 0) return 0.5;

    const eventsPerSecond = totalEvents / (timeWindow / 1000);

    if (eventsPerSecond > 100) return 0.1;
    if (eventsPerSecond < 0.1) return 0.3;
    if (eventsPerSecond >= 1 && eventsPerSecond <= 20) return 0.9;

    return 0.5;
  }

  private getTimeWindow(): number {
    const allTimes = [
      ...this.data.mouseMovements.map(m => m.timestamp),
      ...this.data.scrollPatterns.map(s => s.timestamp),
      ...this.data.keyPresses.map(k => k.timestamp),
      ...this.data.touchEvents.map(t => t.timestamp)
    ];

    if (allTimes.length < 2) return 0;

    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    return max - min;
  }

  getData(): BehavioralData {
    return this.data;
  }

  reset(): void {
    this.data = {
      mouseMovements: [],
      scrollPatterns: [],
      keyPresses: [],
      touchEvents: [],
      focusChanges: []
    };
  }
}
