import { ObjectPool } from '../engine/ObjectPool.js';
import { FIRE_TRAIL_LIFETIME } from '../constants.js';
import { randomRange } from '../utils/math.js';

function createTrailParticle() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 0, size: 1,
    r: 255, g: 150, b: 0,
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

export class TrailRenderer {
  constructor() {
    this.pool = new ObjectPool(createTrailParticle, 500);
    this.emitTimer = 0;
    this.lastX = 0;
    this.lastY = 0;
  }

  update(dt, playerX, playerY, isMoving, intensity) {
    if (!isMoving || intensity <= 0) {
      this.lastX = playerX;
      this.lastY = playerY;
      this.pool.update(dt);
      return;
    }

    this.emitTimer += dt;
    const emitRate = 0.03 / Math.max(0.3, intensity);

    while (this.emitTimer >= emitRate) {
      this.emitTimer -= emitRate;
      const p = this.pool.acquire();
      p.x = playerX + randomRange(0, 42);
      p.y = playerY + randomRange(24, 48);
      p.vx = randomRange(-15, 15);
      p.vy = randomRange(-36, -12);
      p.life = FIRE_TRAIL_LIFETIME * randomRange(0.5, 1.0);
      p.maxLife = p.life;
      p.size = Math.ceil(randomRange(6, 12));

      const colorT = Math.random();
      if (colorT < 0.3) {
        p.r = 255; p.g = 120; p.b = 0;
      } else if (colorT < 0.6) {
        p.r = 220; p.g = 60; p.b = 0;
      } else {
        p.r = 160; p.g = 30; p.b = 0;
      }
      p.dead = false;
    }

    this.lastX = playerX;
    this.lastY = playerY;
    this.pool.update(dt);
  }

  render(ctx, camera) {
    ctx.save();
    for (const p of this.pool.active) {
      if (p.dead) continue;
      const screen = camera.worldToScreen(p.x, p.y);
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio * 0.6);
      const sz = p.size * (0.3 + lifeRatio * 0.7);

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = `rgb(${p.r},${Math.min(255, p.g + 30)},${p.b})`;
      ctx.beginPath();
      ctx.arc(Math.floor(screen.x), Math.floor(screen.y), sz * 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(Math.floor(screen.x), Math.floor(screen.y), sz * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() {
    this.pool.releaseAll();
  }
}
