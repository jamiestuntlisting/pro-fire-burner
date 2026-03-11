export class SoundManager {
  constructor() {
    this.initialized = false;
    this.muted = false;
    this.sfxVolume = 0.5;
    this.musicVolume = 0.3;
    this.Tone = null;
    this.synths = {};
    this.musicPlaying = null;
    this.musicLoops = {};
  }

  async init() {
    try {
      const Tone = await import('https://cdn.skypack.dev/tone@14.7.77');
      this.Tone = Tone;
      await Tone.start();
      this._createSynths();
      this.initialized = true;
    } catch (e) {
      console.warn('Tone.js not available, audio disabled:', e.message);
    }
  }

  _createSynths() {
    if (!this.Tone) return;
    const T = this.Tone;

    this.synths.bleep = new T.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();

    this.synths.whoosh = new T.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.1 },
    }).toDestination();

    this.synths.beep = new T.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.05 },
    }).toDestination();

    this.synths.ignition = new T.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.3 },
    }).toDestination();

    this.synths.splash = new T.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 },
    }).toDestination();

    this.synths.hit = new T.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
    }).toDestination();

    this.synths.alarm = new T.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 },
    }).toDestination();
  }

  play(name, note) {
    if (!this.initialized || this.muted) return;
    const synth = this.synths[name];
    if (!synth) return;
    try {
      if (synth.triggerAttackRelease) {
        synth.triggerAttackRelease(note || 'C5', '8n');
      }
    } catch {}
  }

  playGelPickup() { this.play('bleep', 'E5'); }
  playFuelPickup() { this.play('whoosh'); }
  playCountdownBeep() { this.play('beep', 'A4'); }
  playIgnition() { this.play('ignition'); }
  playSplash() { this.play('splash'); }
  playExtinguish() { this.play('whoosh'); }
  playHit() { this.play('hit', 'C2'); }
  playPanic() { this.play('alarm', 'G5'); }
  playGameOver() { this.play('hit', 'E1'); }

  playBurnBeep() { this.play('beep', 'C6'); }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
