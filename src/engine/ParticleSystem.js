import { ObjectPool } from './ObjectPool.js';

function createParticle() {
  return {
    x: 0, y: 0,
    vx: 0, vy: 0,
    life: 0, maxLife: 0,
    size: 1,
    r: 255, g: 200, b: 0,
    alpha: 1,
    dead: false,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      this.alpha = Math.max(0, this.life / this.maxLife);
      if (this.life <= 0) this.dead = true;
    },
    render(ctx, camera) {
      if (this.alpha <= 0) return;
      const screen = camera.worldToScreen(this.x, this.y);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`;
      ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), this.size, this.size);
      ctx.globalAlpha = 1;
    },
    reset() {
      this.dead = false;
      this.alpha = 1;
      this.life = 0;
    },
  };
}

export class ParticleSystem {
  constructor(poolSize = 500) {
    this.pool = new ObjectPool(createParticle, poolSize);
  }

  emit(x, y, config = {}) {
    const p = this.pool.acquire();
    p.x = x + (config.offsetX || 0);
    p.y = y + (config.offsetY || 0);
    p.vx = config.vx || (Math.random() - 0.5) * 20;
    p.vy = config.vy || -Math.random() * 30;
    p.life = config.life || 1.0;
    p.maxLife = p.life;
    p.size = config.size || 1;
    p.r = config.r || 255;
    p.g = config.g || 200;
    p.b = config.b || 0;
    p.dead = false;
    p.alpha = 1;
    return p;
  }

  emitBurst(x, y, count, config = {}) {
    for (let i = 0; i < count; i++) {
      this.emit(x, y, {
        ...config,
        vx: (config.vx || 0) + (Math.random() - 0.5) * (config.spread || 40),
        vy: (config.vy || 0) + (Math.random() - 0.5) * (config.spread || 40),
      });
    }
  }

  update(dt) {
    this.pool.update(dt);
  }

  render(ctx, camera) {
    this.pool.render(ctx, camera);
  }

  clear() {
    this.pool.releaseAll();
  }

  get activeCount() {
    return this.pool.activeCount;
  }
}
