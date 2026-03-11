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
    this.breatheTimer = Math.random() * Math.PI * 2;

    // Color variation
    this.shirtColor = ['#4488cc', '#cc4488', '#44cc88', '#cccc44', '#8844cc'][randomInt(0, 4)];
    this.pantsColor = ['#334455', '#443322', '#224433', '#333333'][randomInt(0, 3)];
    this.hairColor = ['#553311', '#222222', '#886633', '#aa6622'][randomInt(0, 3)];
  }

  update(dt, tileMap) {
    this.animTimer += dt;
    this.breatheTimer += dt;
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

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + 6, sy + 12, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = this.pantsColor;
    if (this.state === 'WALKING') {
      const legSwing = Math.sin(this.animTimer * 30) * 1.5;
      this._roundRect(ctx, sx + 2, sy + 9 + legSwing * 0.3, 3, 3, 1);
      this._roundRect(ctx, sx + 7, sy + 9 - legSwing * 0.3, 3, 3, 1);
    } else {
      this._roundRect(ctx, sx + 2, sy + 9, 3, 3, 1);
      this._roundRect(ctx, sx + 7, sy + 9, 3, 3, 1);
    }

    // Body
    const bodyGrad = ctx.createLinearGradient(sx + 1, sy + 4, sx + 11, sy + 10);
    bodyGrad.addColorStop(0, this.shirtColor);
    bodyGrad.addColorStop(1, this._darkenColor(this.shirtColor, 0.7));
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 1, sy + 4, 10, 6, 2);

    // Arms
    ctx.fillStyle = this.shirtColor;
    ctx.fillRect(sx, sy + 5, 2, 4);
    ctx.fillRect(sx + 10, sy + 5, 2, 4);

    // Head
    const headGrad = ctx.createRadialGradient(sx + 6, sy + 2, 0, sx + 6, sy + 2, 3);
    headGrad.addColorStop(0, '#f5d4a8');
    headGrad.addColorStop(1, '#e0b888');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 3, sy, 6, 5, 2);

    // Hair
    ctx.fillStyle = this.hairColor;
    ctx.fillRect(sx + 3, sy - 1, 6, 2);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(sx + 4, sy + 2, 1, 1);
    ctx.fillRect(sx + 7, sy + 2, 1, 1);

    // On fire effect
    if (this.state === 'ON_FIRE') {
      const jitter = Math.sin(this.animTimer * 30) * 2;
      // Fire glow
      ctx.fillStyle = 'rgba(255,100,0,0.3)';
      ctx.beginPath();
      ctx.arc(sx + 6 + jitter * 0.5, sy + 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Flame particles on body
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(sx + 3 + jitter, sy - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(sx + 7 - jitter, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(sx + 5, sy - 3 + jitter * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  _darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }
}
