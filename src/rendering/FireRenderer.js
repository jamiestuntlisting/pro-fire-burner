import { ObjectPool } from '../engine/ObjectPool.js';
import { randomRange } from '../utils/math.js';

function createFlameParticle() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 0, size: 1,
    r: 255, g: 200, b: 0,
    dead: false,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    reset() { this.dead = false; },
  };
}

export class FireRenderer {
  constructor() {
    this.pool = new ObjectPool(createFlameParticle, 400);
    this.emitTimer = 0;
  }

  update(dt, playerX, playerY, intensity) {
    if (intensity <= 0) {
      this.pool.releaseAll();
      return;
    }

    this.emitTimer += dt;
    const emitRate = 0.012 / intensity;

    while (this.emitTimer >= emitRate) {
      this.emitTimer -= emitRate;
      const p = this.pool.acquire();
      const flameHeight = 10 + intensity * 18;
      p.x = playerX + randomRange(-6, 14);
      p.y = playerY + randomRange(-6, 2);
      p.vx = randomRange(-15, 15);
      p.vy = randomRange(-flameHeight * 6, -flameHeight * 2.5);
      p.life = randomRange(0.2, 0.55);
      p.maxLife = p.life;
      p.size = Math.ceil(randomRange(2, 4 + intensity * 2));

      // Color gradient: white core -> yellow -> orange -> red -> dark red tips
      const colorT = Math.random();
      if (colorT < 0.1) {
        p.r = 255; p.g = 255; p.b = 200; // white hot core
      } else if (colorT < 0.3) {
        p.r = 255; p.g = 240; p.b = 80; // bright yellow
      } else if (colorT < 0.55) {
        p.r = 255; p.g = 180; p.b = 20; // golden orange
      } else if (colorT < 0.8) {
        p.r = 255; p.g = 100; p.b = 0; // deep orange
      } else {
        p.r = 220; p.g = 40; p.b = 0; // red tips
      }
      p.dead = false;
    }

    this.pool.update(dt);
  }

  render(ctx, camera) {
    ctx.save();
    for (const p of this.pool.active) {
      if (p.dead) continue;
      const screen = camera.worldToScreen(p.x, p.y);
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio * 0.9);
      const screenX = Math.floor(screen.x);
      const screenY = Math.floor(screen.y);
      const sz = p.size * (0.5 + lifeRatio * 0.5);

      // Additive-style glow
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = `rgb(${p.r},${Math.min(255, p.g + 50)},${Math.min(255, p.b + 50)})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, sz * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Core particle
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, sz * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() {
    this.pool.releaseAll();
  }
}
