export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 1.0;
  private soundEnabled: boolean = true;

  private init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
      this.ctx = null;
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
    this.playTone(400, 'triangle', 0.1, 0.05);
    this.playTone(600, 'square', 0.05, 0.02);
  }

  public playCollect() {
    this.playTone(800, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1000, 'sine', 0.2, 0.1), 50);
  }

  public playGameOver() {
    this.playTone(150, 'square', 0.3, 0.2);
    this.playTone(100, 'sawtooth', 0.5, 0.1);
  }

  public playWin() {
    const scale = [523.25, 659.25, 783.99, 1046.50];
    scale.forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.1), i * 100);
    });
  }

  public playLevelUp() {
    this.playTone(600, 'sine', 0.1);
    this.playTone(900, 'sine', 0.15);
  }
}

export const soundManager = new SoundManager();
