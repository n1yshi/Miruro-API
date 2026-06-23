import { WebGLFingerprint } from '../utils/types';

export class WebGLFingerprinter {
  fingerprint(): WebGLFingerprint {
    const defaultFp: WebGLFingerprint = {
      renderer: 'unknown',
      vendor: 'unknown',
      version: 'unknown',
      shadingLanguageVersion: 'unknown'
    };

    if (typeof document === 'undefined') return defaultFp;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) return defaultFp;

      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');

      if (!debugInfo) {
        return {
          renderer: 'no-debug-info',
          vendor: 'no-debug-info',
          version: (gl as any).getParameter((gl as any).VERSION) || 'unknown',
          shadingLanguageVersion: (gl as any).getParameter((gl as any).SHADING_LANGUAGE_VERSION) || 'unknown'
        };
      }

      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
      const version = (gl as any).getParameter((gl as any).VERSION) || 'unknown';
      const shadingLanguageVersion = (gl as any).getParameter((gl as any).SHADING_LANGUAGE_VERSION) || 'unknown';

      return {
        renderer,
        vendor,
        version,
        shadingLanguageVersion
      };
    } catch {
      return defaultFp;
    }
  }

  getRendererInfo(): string {
    const fp = this.fingerprint();
    return `${fp.vendor}|${fp.renderer}`;
  }
}
