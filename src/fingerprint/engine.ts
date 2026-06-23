import { CanvasFingerprinter } from './canvas';
import { WebGLFingerprinter } from './webgl';
import { AudioFingerprinter } from './audio';
import {
  FingerprintData,
  WebGLFingerprint,
  HardwareFingerprint,
  DisplayFingerprint,
  EnvironmentFingerprint,
} from '../utils/types';

export class FingerprintEngine {
  private canvasFp: CanvasFingerprinter;
  private webglFp: WebGLFingerprinter;
  private audioFp: AudioFingerprinter;
  private cachedFingerprint: FingerprintData | null = null;

  constructor() {
    this.canvasFp = new CanvasFingerprinter();
    this.webglFp = new WebGLFingerprinter();
    this.audioFp = new AudioFingerprinter();
  }

  generate(): FingerprintData {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    const canvas = this.canvasFp.fingerprint();
    const webgl = this.webglFp.fingerprint();
    const audio = this.audioFp.fingerprint();
    const hardware = this.getHardwareInfo();
    const display = this.getDisplayInfo();
    const environment = this.getEnvironmentInfo();

    const combined = this.combineFingerprints({
      canvas, webgl, audio, hardware, display, environment
    });

    const fp: FingerprintData = {
      canvas,
      webgl,
      audio,
      hardware,
      display,
      environment,
      combined
    };

    this.cachedFingerprint = fp;
    return fp;
  }

  private getHardwareInfo(): HardwareFingerprint {
    const nav = navigator;
    return {
      cpuCores: (nav as any).hardwareConcurrency || 0,
      memoryMB: null,
      hardwareConcurrency: (nav as any).hardwareConcurrency || 0,
      deviceMemory: (nav as any).deviceMemory || null,
    };
  }

  private getDisplayInfo(): DisplayFingerprint {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0, colorDepth: 0, pixelDepth: 0, availWidth: 0, availHeight: 0 };
    }

    const s = window.screen;
    return {
      width: s.width,
      height: s.height,
      colorDepth: s.colorDepth,
      pixelDepth: s.pixelDepth,
      availWidth: s.availWidth,
      availHeight: s.availHeight,
    };
  }

  private getEnvironmentInfo(): EnvironmentFingerprint {
    const nav = navigator;

    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: nav.language || '',
      languages: Array.from(nav.languages || []),
      platform: nav.platform || '',
      userAgent: nav.userAgent || '',
    };
  }

  private combineFingerprints(parts: {
    canvas: string;
    webgl: WebGLFingerprint;
    audio: string;
    hardware: HardwareFingerprint;
    display: DisplayFingerprint;
    environment: EnvironmentFingerprint;
  }): string {
    const data = [
      parts.canvas,
      parts.webgl.renderer,
      parts.webgl.vendor,
      parts.audio,
      parts.hardware.hardwareConcurrency,
      parts.hardware.deviceMemory,
      parts.display.width,
      parts.display.height,
      parts.display.colorDepth,
      parts.environment.timezone,
      parts.environment.locale,
      parts.environment.languages.join(','),
      parts.environment.platform,
    ].join('|');

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36) +
      Math.abs(this.hashString(data)).toString(36);
  }

  private hashString(str: string): number {
    let hash1 = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash1 ^= str.charCodeAt(i);
      hash1 = Math.imul(hash1, 0x01000193);
    }
    return hash1 >>> 0;
  }

  clearCache(): void {
    this.cachedFingerprint = null;
  }

  compareWith(other: FingerprintData): number {
    if (!this.cachedFingerprint) return 0;

    const current = this.cachedFingerprint;
    let matches = 0;
    let total = 0;

    if (current.canvas === other.canvas) matches++;
    total++;

    if (current.webgl.renderer === other.webgl.renderer) matches++;
    total++;
    if (current.webgl.vendor === other.webgl.vendor) matches++;
    total++;

    if (current.audio === other.audio) matches++;
    total++;

    if (current.display.width === other.display.width) matches++;
    total++;
    if (current.display.height === other.display.height) matches++;
    total++;

    if (current.environment.timezone === other.environment.timezone) matches++;
    total++;
    if (current.environment.locale === other.environment.locale) matches++;
    total++;

    return total > 0 ? matches / total : 0;
  }
}
