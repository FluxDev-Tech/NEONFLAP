export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 1.0;
  private soundEnabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const finalVolume = volume * this.masterVolume;
    gain.gain.setValueAtTime(finalVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playFlip() {
    this.playTone(150, 'square', 0.1, 0.05);
    this.playTone(300, 'sine', 0.15, 0.05);
  }

  public playCollect() {
    this.playTone(880, 'sine', 0.2, 0.08);
    setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.05), 50);
  }

  public playGameOver() {
    const now = this.ctx?.currentTime || 0;
    this.playTone(200, 'sawtooth', 0.5, 0.1);
    setTimeout(() => this.playTone(150, 'sawtooth', 0.5, 0.1), 100);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.8, 0.1), 200);
  }

  public playWin() {
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.6, 0.08), i * 150);
    });
  }

  public playLevelUp() {
    this.playTone(600, 'sine', 0.1);
    this.playTone(900, 'sine', 0.15);
  }
}

export const soundManager = new SoundManager();
