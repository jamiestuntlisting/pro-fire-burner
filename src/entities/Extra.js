import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, EXTRA_CATCH_RADIUS } from '../constants.js';
import { randomRange, randomInt } from '../utils/math.js';

export class Extra extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 20;
    this.height = 44;

    // AI state
    this.targetX = x;
    this.targetY = y;
    this.moveSpeed = 120;
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

    // Color variation — darker, industrial / utilitarian Metroid palette
    this.shirtColor = ['#2a4a5e', '#5e2a3a', '#2a5e3e', '#4e4e28', '#3a2a5e'][randomInt(0, 4)];
    this.pantsColor = ['#1e2830', '#2a1e16', '#162a1e', '#1a1a1a'][randomInt(0, 3)];
    this.hairColor = ['#2e1a08', '#111111', '#4a3018', '#5e3010'][randomInt(0, 3)];
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
    const cx = sx + 10;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 44, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const legSwing = this.state === 'WALKING' ? Math.sin(this.animTimer * 30) * 3 : 0;

    // Shoes
    ctx.fillStyle = '#0e0e0e';
    this._roundRect(ctx, sx + 1, sy + 38 + legSwing * 0.3, 6, 5, 2);
    this._roundRect(ctx, sx + 13, sy + 38 - legSwing * 0.3, 6, 5, 2);

    // Legs - slim
    ctx.fillStyle = this.pantsColor;
    this._roundRect(ctx, sx + 2, sy + 28 + legSwing * 0.3, 5, 12, 2);
    this._roundRect(ctx, sx + 13, sy + 28 - legSwing * 0.3, 5, 12, 2);

    // Torso
    const bodyGrad = ctx.createLinearGradient(sx, sy + 12, sx + 20, sy + 30);
    bodyGrad.addColorStop(0, this.shirtColor);
    bodyGrad.addColorStop(1, this._darkenColor(this.shirtColor, 0.5));
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx, sy + 12, 20, 18, 4);

    // Belt
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx + 1, sy + 26, 18, 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + 8, sy + 26, 4, 2);

    // Arms - slim
    ctx.fillStyle = this._darkenColor(this.shirtColor, 0.7);
    this._roundRect(ctx, sx - 2, sy + 14, 4, 12, 1);
    this._roundRect(ctx, sx + 18, sy + 14, 4, 12, 1);
    // Hands
    ctx.fillStyle = '#c4a882';
    this._roundRect(ctx, sx - 1, sy + 24, 3, 3, 1);
    this._roundRect(ctx, sx + 18, sy + 24, 3, 3, 1);

    // Neck
    ctx.fillStyle = '#b89870';
    ctx.fillRect(sx + 7, sy + 8, 6, 5);

    // Head
    const headGrad = ctx.createRadialGradient(cx, sy + 4, 0, cx, sy + 4, 7);
    headGrad.addColorStop(0, '#c4a882');
    headGrad.addColorStop(1, '#a08060');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 3, sy - 2, 14, 13, 5);

    // Hair
    ctx.fillStyle = this.hairColor;
    this._roundRect(ctx, sx + 3, sy - 4, 14, 5, 3);
    ctx.fillRect(sx + 3, sy - 2, 2, 4);
    ctx.fillRect(sx + 15, sy - 2, 2, 4);

    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(sx + 6, sy + 3, 2, 2);
    ctx.fillRect(sx + 12, sy + 3, 2, 2);
    ctx.fillStyle = 'rgba(200,210,220,0.4)';
    ctx.fillRect(sx + 6, sy + 3, 1, 1);
    ctx.fillRect(sx + 12, sy + 3, 1, 1);

    // Mouth
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx + 8, sy + 7, 4, 1);

    // On fire effect
    if (this.state === 'ON_FIRE') {
      const jitter = Math.sin(this.animTimer * 30) * 4;

      ctx.fillStyle = 'rgba(255,60,0,0.15)';
      ctx.beginPath();
      ctx.arc(cx + jitter * 0.3, sy + 12, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,100,0,0.3)';
      ctx.beginPath();
      ctx.arc(cx + jitter * 0.5, sy + 10, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(sx + 5 + jitter, sy - 2, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(sx + 14 - jitter, sy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(cx, sy - 6 + jitter * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(sx + 16 + jitter * 0.5, sy - 4, 2, 0, Math.PI * 2);
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
