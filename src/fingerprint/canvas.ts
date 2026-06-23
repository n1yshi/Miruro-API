export class CanvasFingerprinter {
  fingerprint(): string {
    if (typeof document === 'undefined') return 'no-dom';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-context';

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);

      ctx.fillStyle = '#069';
      ctx.font = '11pt Arial';
      ctx.fillText('Aegis-AntiBot-Test', 2, 15);

      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Georgia';
      ctx.fillText('ABCdef123', 4, 45);

      ctx.fillStyle = '#rgb(0,102,153)';
      ctx.font = '8pt Courier New';
      ctx.fillText('!@#$%^&*()_+-=', 10, 70);

      ctx.strokeStyle = '#abc';
      ctx.beginPath();
      ctx.arc(50, 130, 40, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(130, 130, 30, 0, Math.PI * 1.5);
      ctx.fill();

      ctx.fillStyle = '#rgb(80,80,80)';
      ctx.font = '12pt Impact';
      ctx.fillText('The quick brown fox jumps over the lazy dog', 10, 200);

      ctx.fillStyle = 'rgb(200,200,200)';
      ctx.font = '10pt Comic Sans MS';
      ctx.fillText('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10, 230);

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const hash = this.hashDataUrl(dataUrl);
      return hash;
    } catch {
      return 'canvas-error';
    }
  }

  private hashDataUrl(dataUrl: string): string {
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
