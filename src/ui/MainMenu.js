import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class MainMenu {
  constructor() {
    this.selectedIndex = 0;
    this.options = ['NEW GAME'];
    this.showAdmin = false;
    this.fireParticles = [];
    this.timer = 0;

    // Check for admin access
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true') {
        this.showAdmin = true;
        this.options.push('ADMIN');
      }
    }

    // Konami code detection
    this.konamiSequence = [];
    this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

    // Init fire particles
    for (let i = 0; i < 60; i++) {
      this.fireParticles.push(this._createParticle());
    }
  }

  _createParticle() {
    return {
      x: randomRange(0, VIEWPORT_WIDTH),
      y: randomRange(VIEWPORT_HEIGHT * 0.5, VIEWPORT_HEIGHT),
      vy: randomRange(-40, -15),
      vx: randomRange(-5, 5),
      life: randomRange(0.5, 2.0),
      maxLife: 2.0,
      size: randomRange(1, 3),
      r: Math.floor(randomRange(200, 255)),
      g: Math.floor(randomRange(50, 200)),
      b: 0,
    };
  }

  checkKonami(keyCode) {
    this.konamiSequence.push(keyCode);
    if (this.konamiSequence.length > 10) {
      this.konamiSequence.shift();
    }
    if (this.konamiSequence.length === 10 &&
        this.konamiSequence.every((k, i) => k === this.konamiCode[i])) {
      this.showAdmin = true;
      if (!this.options.includes('ADMIN')) {
        this.options.push('ADMIN');
      }
    }
  }

  update(dt, input) {
    this.timer += dt;

    // Update fire particles
    for (const p of this.fireParticles) {
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      p.life -= dt;
      if (p.life <= 0) {
        Object.assign(p, this._createParticle());
      }
    }

    // Auto-transition after 3 seconds, or any input
    if (this.timer > 3 || input.enterJustPressed || input.anyKeyPressed()) {
      return 'NEW GAME';
    }

    return null;
  }

  render(ctx) {
    // Background
    ctx.fillStyle = '#110800';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Fire particles background
    for (const p of this.fireParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Title
    const titleY = 120;
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("STUNTLISTING'S", VIEWPORT_WIDTH / 2, titleY);
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('PRO FIRE BURNER', VIEWPORT_WIDTH / 2, titleY + 44);

    // Fire effect on title
    const flicker = Math.sin(this.timer * 8) * 2;
    ctx.fillStyle = '#ff4400';
    ctx.font = 'bold 36px monospace';
    ctx.globalAlpha = 0.3;
    ctx.fillText('PRO FIRE BURNER', VIEWPORT_WIDTH / 2 + flicker, titleY + 43);
    ctx.globalAlpha = 1;

    // Tagline
    ctx.fillStyle = '#aa7744';
    ctx.font = '14px monospace';
    ctx.fillText('"The longer the burn, the bigger the check"', VIEWPORT_WIDTH / 2, titleY + 76);

    ctx.textAlign = 'left';
  }
}
