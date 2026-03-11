import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export class Countdown {
  constructor() {
    this.timer = 0;
    this.duration = 4.0; // 3-2-1-BURN
    this.phase = 0; // 0=3, 1=2, 2=1, 3=BURN
    this.done = false;
    this.soundManager = null;
  }

  reset(soundManager) {
    this.timer = 0;
    this.phase = 0;
    this.done = false;
    this.soundManager = soundManager;
    this._lastPhase = -1;
  }

  update(dt) {
    if (this.done) return true;
    this.timer += dt;

    if (this.timer < 1.0) {
      this.phase = 0;
    } else if (this.timer < 2.0) {
      this.phase = 1;
    } else if (this.timer < 3.0) {
      this.phase = 2;
    } else if (this.timer < 3.8) {
      this.phase = 3;
    } else {
      this.done = true;
      return true;
    }

    // Play sound on phase change
    if (this.phase !== this._lastPhase && this.soundManager) {
      if (this.phase < 3) {
        this.soundManager.playCountdownBeep();
      } else {
        this.soundManager.playBurnBeep();
      }
      this._lastPhase = this.phase;
    }

    return false;
  }

  render(ctx) {
    if (this.done) return;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const cx = VIEWPORT_WIDTH / 2;
    const cy = VIEWPORT_HEIGHT / 2;

    const labels = ['3', '2', '1', 'BURN!'];
    const text = labels[this.phase];

    // Scale animation
    const phaseT = (this.timer % 1.0);
    const scale = 1.0 + Math.sin(phaseT * Math.PI) * 0.2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if (this.phase < 3) {
      // Number
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 80px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);

      // Glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff6600';
      ctx.fillText(text, 2, 2);
      ctx.globalAlpha = 1;
    } else {
      // BURN!
      ctx.fillStyle = '#ff4400';
      ctx.font = 'bold 60px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);

      // Fire glow
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(text, 0, -3);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
