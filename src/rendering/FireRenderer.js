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
    this.pool = new ObjectPool(createFlameParticle, 200);
    this.emitTimer = 0;
  }

  update(dt, playerX, playerY, intensity) {
    if (intensity <= 0) {
      this.pool.releaseAll();
      return;
    }

    this.emitTimer += dt;
    const emitRate = 0.02 / intensity;

    while (this.emitTimer >= emitRate) {
      this.emitTimer -= emitRate;
      const p = this.pool.acquire();
      const flameHeight = 6 + intensity * 10;
      p.x = playerX + randomRange(-4, 10);
      p.y = playerY + randomRange(-4, 2);
      p.vx = randomRange(-10, 10);
      p.vy = randomRange(-flameHeight * 5, -flameHeight * 2);
      p.life = randomRange(0.15, 0.4);
      p.maxLife = p.life;
      p.size = Math.ceil(randomRange(1, 2 + intensity));

      // Color: yellow-orange-red gradient
      const colorT = Math.random();
      if (colorT < 0.3) {
        p.r = 255; p.g = 255; p.b = 100; // yellow
      } else if (colorT < 0.7) {
        p.r = 255; p.g = 150; p.b = 0; // orange
      } else {
        p.r = 255; p.g = 50; p.b = 0; // red
      }
      p.dead = false;
    }

    this.pool.update(dt);
  }

  render(ctx, camera) {
    for (const p of this.pool.active) {
      if (p.dead) continue;
      const screen = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, p.life / p.maxLife);
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
