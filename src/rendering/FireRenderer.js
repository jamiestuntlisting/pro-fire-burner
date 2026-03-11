import { ObjectPool } from '../engine/ObjectPool.js';
import { randomRange } from '../utils/math.js';

function createFlameParticle() {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 0, size: 1,
    r: 255, g: 200, b: 0,
    dead: false,
    layer: 0, // 0=outer glow, 1=mid flame, 2=core
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Flames rise and slow down
      this.vy *= 0.98;
      this.vx *= 0.95;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    reset() { this.dead = false; },
  };
}

export class FireRenderer {
  constructor() {
    this.pool = new ObjectPool(createFlameParticle, 500);
    this.emitTimer = 0;
    this.flameTimer = 0;
  }

  update(dt, playerX, playerY, intensity) {
    if (intensity <= 0) {
      this.pool.releaseAll();
      return;
    }

    this.flameTimer += dt;
    this.emitTimer += dt;
    const emitRate = 0.008 / intensity;

    // Emit from above the player's head area
    const headX = playerX + 12; // center of player
    const headY = playerY - 10; // above head

    while (this.emitTimer >= emitRate) {
      this.emitTimer -= emitRate;

      // Large cartoon flame tongues that rise upward
      const p = this.pool.acquire();
      const flameHeight = 40 + intensity * 60;
      // Emit from a narrow base at the head
      p.x = headX + randomRange(-8, 8);
      p.y = headY + randomRange(-5, 5);
      // Rise strongly upward with slight sway
      const sway = Math.sin(this.flameTimer * 8 + p.x * 0.1) * 20;
      p.vx = randomRange(-15, 15) + sway;
      p.vy = randomRange(-flameHeight * 4, -flameHeight * 2);
      p.life = randomRange(0.3, 0.7);
      p.maxLife = p.life;
      p.size = Math.ceil(randomRange(10, 20 + intensity * 8));

      // Cartoon flame colors - bright oranges and yellows
      const colorT = Math.random();
      if (colorT < 0.15) {
        // White hot core
        p.r = 255; p.g = 255; p.b = 220;
        p.layer = 2;
      } else if (colorT < 0.4) {
        // Bright yellow
        p.r = 255; p.g = 230; p.b = 50;
        p.layer = 1;
      } else if (colorT < 0.65) {
        // Orange
        p.r = 255; p.g = 160; p.b = 10;
        p.layer = 1;
      } else if (colorT < 0.85) {
        // Deep orange
        p.r = 255; p.g = 80; p.b = 0;
        p.layer = 0;
      } else {
        // Red tip
        p.r = 230; p.g = 30; p.b = 0;
        p.layer = 0;
      }
      p.dead = false;
    }

    this.pool.update(dt);
  }

  render(ctx, camera) {
    ctx.save();

    // Render outer glow first, then mid, then core (painter's algorithm)
    for (let layer = 0; layer <= 2; layer++) {
      for (const p of this.pool.active) {
        if (p.dead || p.layer !== layer) continue;
        const screen = camera.worldToScreen(p.x, p.y);
        const lifeRatio = p.life / p.maxLife;
        const screenX = Math.floor(screen.x);
        const screenY = Math.floor(screen.y);

        // Cartoon flame shape - teardrop pointing upward
        const sz = p.size * (0.3 + lifeRatio * 0.7);
        const alpha = Math.max(0, lifeRatio * 0.85);

        // Outer glow
        if (layer === 0) {
          ctx.globalAlpha = alpha * 0.2;
          ctx.fillStyle = `rgb(${p.r},${Math.min(255, p.g + 40)},${Math.min(255, p.b + 40)})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, sz * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main flame body - teardrop shape
        ctx.globalAlpha = alpha * (layer === 2 ? 0.9 : 0.7);
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        // Draw a teardrop: wide at bottom, pointed at top
        ctx.moveTo(screenX, screenY - sz * 1.2);
        ctx.bezierCurveTo(
          screenX - sz * 0.6, screenY - sz * 0.4,
          screenX - sz * 0.8, screenY + sz * 0.3,
          screenX, screenY + sz * 0.5
        );
        ctx.bezierCurveTo(
          screenX + sz * 0.8, screenY + sz * 0.3,
          screenX + sz * 0.6, screenY - sz * 0.4,
          screenX, screenY - sz * 1.2
        );
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() {
    this.pool.releaseAll();
  }
}
