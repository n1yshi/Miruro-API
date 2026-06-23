export class AudioFingerprinter {
  fingerprint(): string {
    if (typeof window === 'undefined') return 'no-window';

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      const gain = audioCtx.createGain();
      const destination = audioCtx.createMediaStreamDestination();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gain);
      gain.connect(analyser);
      analyser.connect(destination);

      oscillator.start(0);
      oscillator.stop(0.1);

      const data = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(data);

      let hash = 0;
      for (let i = 0; i < Math.min(100, data.length); i++) {
        const val = Math.abs(Math.floor(data[i] * 100));
        hash = ((hash << 5) - hash) + val;
        hash = hash & hash;
      }

      audioCtx.close();

      return Math.abs(hash).toString(36);
    } catch {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = audioCtx.createBuffer(1, 44100, 44100);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.sin(440 * 2 * Math.PI * i / 44100) * 0.1;
        }
        let hash = 0;
        for (let i = 0; i < Math.min(1000, data.length); i++) {
          const val = Math.abs(Math.floor(data[i] * 10000));
          hash = ((hash << 5) - hash) + val;
          hash = hash & hash;
        }
        audioCtx.close();
        return Math.abs(hash).toString(36);
      } catch {
        return 'audio-error';
      }
    }
  }
}
