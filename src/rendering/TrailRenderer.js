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
    this.pool = new ObjectPool(createTrailParticle, 300);
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
    const emitRate = 0.05 / Math.max(0.3, intensity);

    while (this.emitTimer >= emitRate) {
      this.emitTimer -= emitRate;
      const p = this.pool.acquire();
      p.x = playerX + randomRange(0, 12);
      p.y = playerY + randomRange(8, 14);
      p.vx = randomRange(-3, 3);
      p.vy = randomRange(-8, -3);
      p.life = FIRE_TRAIL_LIFETIME * randomRange(0.5, 1.0);
      p.maxLife = p.life;
      p.size = Math.ceil(randomRange(1, 2));

      const colorT = Math.random();
      if (colorT < 0.4) {
        p.r = 255; p.g = 100; p.b = 0;
      } else if (colorT < 0.7) {
        p.r = 200; p.g = 50; p.b = 0;
      } else {
        p.r = 150; p.g = 30; p.b = 0;
      }
      p.dead = false;
    }

    this.lastX = playerX;
    this.lastY = playerY;
    this.pool.update(dt);
  }

  render(ctx, camera) {
    for (const p of this.pool.active) {
      if (p.dead) continue;
      const screen = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, (p.life / p.maxLife) * 0.7);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.releaseAll();
  }
}
