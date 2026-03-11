import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, EXTRA_CATCH_RADIUS } from '../constants.js';
import { randomRange, randomInt } from '../utils/math.js';

export class Extra extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 36;
    this.height = 36;

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

    // Ground shadow — darker and larger for industrial feel
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx + 18, sy + 36, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient shadow under the figure (Metroid-style floor glow)
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(sx + 18, sy + 36, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs — heavy industrial boots
    ctx.fillStyle = this.pantsColor;
    if (this.state === 'WALKING') {
      const legSwing = Math.sin(this.animTimer * 30) * 4.5;
      this._roundRect(ctx, sx + 6, sy + 27 + legSwing * 0.3, 9, 9, 3);
      this._roundRect(ctx, sx + 21, sy + 27 - legSwing * 0.3, 9, 9, 3);
    } else {
      this._roundRect(ctx, sx + 6, sy + 27, 9, 9, 3);
      this._roundRect(ctx, sx + 21, sy + 27, 9, 9, 3);
    }

    // Boot soles — dark metallic accent
    ctx.fillStyle = '#0e0e0e';
    if (this.state === 'WALKING') {
      const legSwing = Math.sin(this.animTimer * 30) * 4.5;
      ctx.fillRect(sx + 6, sy + 33 + legSwing * 0.3, 9, 3);
      ctx.fillRect(sx + 21, sy + 33 - legSwing * 0.3, 9, 3);
    } else {
      ctx.fillRect(sx + 6, sy + 33, 9, 3);
      ctx.fillRect(sx + 21, sy + 33, 9, 3);
    }

    // Body — industrial suit with heavy gradient
    const bodyGrad = ctx.createLinearGradient(sx + 3, sy + 12, sx + 33, sy + 30);
    bodyGrad.addColorStop(0, this.shirtColor);
    bodyGrad.addColorStop(0.5, this._darkenColor(this.shirtColor, 0.6));
    bodyGrad.addColorStop(1, this._darkenColor(this.shirtColor, 0.4));
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 3, sy + 12, 30, 18, 6);

    // Utility belt / waist detail
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx + 5, sy + 26, 26, 3);
    ctx.fillStyle = '#333333';
    ctx.fillRect(sx + 15, sy + 26, 6, 3); // belt buckle

    // Chest panel — Metroid-style armor detail
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this._roundRect(ctx, sx + 9, sy + 14, 18, 10, 3);
    ctx.fillStyle = 'rgba(80,90,100,0.25)';
    this._roundRect(ctx, sx + 11, sy + 15, 14, 8, 2);

    // Arms — armored sleeves
    const armGrad1 = ctx.createLinearGradient(sx, sy + 15, sx + 6, sy + 27);
    armGrad1.addColorStop(0, this.shirtColor);
    armGrad1.addColorStop(1, this._darkenColor(this.shirtColor, 0.45));
    ctx.fillStyle = armGrad1;
    this._roundRect(ctx, sx, sy + 15, 6, 12, 2);

    const armGrad2 = ctx.createLinearGradient(sx + 30, sy + 15, sx + 36, sy + 27);
    armGrad2.addColorStop(0, this.shirtColor);
    armGrad2.addColorStop(1, this._darkenColor(this.shirtColor, 0.45));
    ctx.fillStyle = armGrad2;
    this._roundRect(ctx, sx + 30, sy + 15, 6, 12, 2);

    // Shoulder pads — industrial armor
    ctx.fillStyle = this._darkenColor(this.shirtColor, 0.5);
    this._roundRect(ctx, sx - 1, sy + 13, 8, 5, 2);
    this._roundRect(ctx, sx + 29, sy + 13, 8, 5, 2);

    // Head — muted skin tones
    const headGrad = ctx.createRadialGradient(sx + 18, sy + 6, 0, sx + 18, sy + 6, 9);
    headGrad.addColorStop(0, '#c4a882');
    headGrad.addColorStop(1, '#a08060');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 9, sy, 18, 15, 6);

    // Hair — darker and heavier
    ctx.fillStyle = this.hairColor;
    this._roundRect(ctx, sx + 9, sy - 3, 18, 6, 3);
    // Side hair
    ctx.fillRect(sx + 9, sy - 1, 3, 5);
    ctx.fillRect(sx + 24, sy - 1, 3, 5);

    // Eyes — sharper, more intense
    ctx.fillStyle = '#111';
    ctx.fillRect(sx + 12, sy + 6, 3, 3);
    ctx.fillRect(sx + 21, sy + 6, 3, 3);
    // Eye highlights
    ctx.fillStyle = 'rgba(200,210,220,0.4)';
    ctx.fillRect(sx + 13, sy + 6, 1, 1);
    ctx.fillRect(sx + 22, sy + 6, 1, 1);

    // Mouth — subtle line
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx + 15, sy + 11, 6, 1);

    // On fire effect — scaled and more intense
    if (this.state === 'ON_FIRE') {
      const jitter = Math.sin(this.animTimer * 30) * 6;

      // Intense heat distortion / glow
      ctx.fillStyle = 'rgba(255,60,0,0.15)';
      ctx.beginPath();
      ctx.arc(sx + 18 + jitter * 0.3, sy + 12, 30, 0, Math.PI * 2);
      ctx.fill();

      // Fire glow — close to body
      ctx.fillStyle = 'rgba(255,100,0,0.3)';
      ctx.beginPath();
      ctx.arc(sx + 18 + jitter * 0.5, sy + 12, 24, 0, Math.PI * 2);
      ctx.fill();

      // Primary flame
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(sx + 9 + jitter, sy - 3, 9, 0, Math.PI * 2);
      ctx.fill();

      // Secondary flame
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(sx + 21 - jitter, sy, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Flame tips
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(sx + 15, sy - 9 + jitter * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();

      // Ember sparks
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(sx + 24 + jitter * 0.7, sy - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(sx + 6 - jitter * 0.5, sy + 3, 2.5, 0, Math.PI * 2);
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
