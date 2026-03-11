import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, EXTRA_CATCH_RADIUS } from '../constants.js';
import { randomRange, randomInt } from '../utils/math.js';

export class Extra extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 12;
    this.height = 12;

    // AI state
    this.targetX = x;
    this.targetY = y;
    this.moveSpeed = 40;
    this.pauseTimer = randomRange(1, 3);
    this.isWalking = false;
    this.state = 'IDLE'; // IDLE, WALKING, ON_FIRE, FALLEN

    // On fire state
    this.onFireTimer = 0;
    this.panicDir = { x: 0, y: 0 };

    // Animation
    this.animTimer = 0;
    this.animFrame = 0;

    // Color variation
    this.shirtColor = ['#4488cc', '#cc4488', '#44cc88', '#cccc44', '#8844cc'][randomInt(0, 4)];
    this.pantsColor = ['#334455', '#443322', '#224433', '#333333'][randomInt(0, 3)];
  }

  update(dt, tileMap) {
    this.animTimer += dt;
    if (this.animTimer > 0.2) {
      this.animTimer -= 0.2;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    switch (this.state) {
      case 'IDLE':
        this.pauseTimer -= dt;
        if (this.pauseTimer <= 0) {
          this._pickNewTarget(tileMap);
          this.state = 'WALKING';
        }
        break;

      case 'WALKING':
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          this.state = 'IDLE';
          this.pauseTimer = randomRange(1, 2);
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          const newX = this.x + nx * this.moveSpeed * dt;
          const newY = this.y + ny * this.moveSpeed * dt;

          if (tileMap && tileMap.isSolid(newX + this.width / 2, newY + this.height / 2)) {
            this.state = 'IDLE';
            this.pauseTimer = randomRange(0.5, 1.5);
          } else {
            this.x = newX;
            this.y = newY;
          }
        }
        break;

      case 'ON_FIRE':
        this.onFireTimer += dt;
        this.x += this.panicDir.x * this.moveSpeed * 2 * dt;
        this.y += this.panicDir.y * this.moveSpeed * 2 * dt;
        if (this.onFireTimer >= 2.0) {
          this.state = 'FALLEN';
          this.dead = true;
        }
        break;
    }
  }

  catchFire() {
    if (this.state === 'ON_FIRE' || this.state === 'FALLEN') return false;
    this.state = 'ON_FIRE';
    this.onFireTimer = 0;
    const angle = Math.random() * Math.PI * 2;
    this.panicDir = { x: Math.cos(angle), y: Math.sin(angle) };
    return true;
  }

  _pickNewTarget(tileMap) {
    const range = TILE_SIZE * 5;
    for (let attempts = 0; attempts < 10; attempts++) {
      const tx = this.x + randomRange(-range, range);
      const ty = this.y + randomRange(-range, range);
      if (!tileMap || (!tileMap.isSolid(tx, ty) && !tileMap.isWater(tx, ty))) {
        this.targetX = tx;
        this.targetY = ty;
        return;
      }
    }
    this.targetX = this.x;
    this.targetY = this.y;
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    if (this.state === 'FALLEN') return;

    // Body
    ctx.fillStyle = this.shirtColor;
    ctx.fillRect(sx + 1, sy + 4, 10, 7);

    // Head
    ctx.fillStyle = '#eebb88';
    ctx.fillRect(sx + 3, sy, 6, 5);

    // Legs
    ctx.fillStyle = this.pantsColor;
    ctx.fillRect(sx + 2, sy + 10, 3, 2);
    ctx.fillRect(sx + 7, sy + 10, 3, 2);

    // On fire effect (jittering)
    if (this.state === 'ON_FIRE') {
      const jitter = Math.sin(this.animTimer * 30) * 2;
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(sx + jitter, sy - 2, 12, 3);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx + 3 + jitter, sy - 4, 6, 3);
    }
  }
}
