import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class MainMenu {
  constructor() {
    this.selectedIndex = 0;
    this.options = ['NEW GAME', 'HIGH SCORES'];
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

    // Navigation
    if (input.enterJustPressed) {
      return this.options[this.selectedIndex];
    }

    if (input.keys['ArrowUp'] || input.keys['KeyW']) {
      if (!this._prevUp) {
        this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      }
      this._prevUp = true;
    } else {
      this._prevUp = false;
    }

    if (input.keys['ArrowDown'] || input.keys['KeyS']) {
      if (!this._prevDown) {
        this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      }
      this._prevDown = true;
    } else {
      this._prevDown = false;
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
    const titleY = 60;
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE BURN', VIEWPORT_WIDTH / 2, titleY);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('SIMULATOR', VIEWPORT_WIDTH / 2, titleY + 20);

    // Fire effect on title
    const flicker = Math.sin(this.timer * 8) * 2;
    ctx.fillStyle = '#ff4400';
    ctx.font = 'bold 16px monospace';
    ctx.globalAlpha = 0.3;
    ctx.fillText('FIRE BURN', VIEWPORT_WIDTH / 2 + flicker, titleY - 1);
    ctx.globalAlpha = 1;

    // Tagline
    ctx.fillStyle = '#aa7744';
    ctx.font = '7px monospace';
    ctx.fillText('"Stay on fire and stay safe!"', VIEWPORT_WIDTH / 2, titleY + 38);

    // Menu options
    const menuStartY = titleY + 70;
    for (let i = 0; i < this.options.length; i++) {
      const y = menuStartY + i * 20;
      const selected = i === this.selectedIndex;

      if (selected) {
        ctx.fillStyle = '#ff6600';
        ctx.fillText('>', VIEWPORT_WIDTH / 2 - 50, y);
        ctx.fillStyle = '#ffcc00';
      } else {
        ctx.fillStyle = '#886644';
      }
      ctx.font = '10px monospace';
      ctx.fillText(this.options[i], VIEWPORT_WIDTH / 2, y);
    }

    // Controls hint
    ctx.fillStyle = '#554433';
    ctx.font = '6px monospace';
    ctx.fillText('ARROWS/WASD to move  |  SPACE to lay down  |  ENTER to select', VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 15);

    ctx.textAlign = 'left';
  }
}
