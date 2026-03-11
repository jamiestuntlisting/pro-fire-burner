import { Entity } from '../engine/Entity.js';
import {
  PLAYER_SPEED, GEL_MAX, FUEL_MAX, GEL_DEPLETION_BASE, FUEL_DEPLETION_BASE,
  GEL_PICKUP_AMOUNT, FUEL_PICKUP_AMOUNT, TILE_SIZE,
} from '../constants.js';
import { normalize } from '../utils/math.js';

export const FIRE_STATE = {
  NOT_LIT: 'NOT_LIT',
  ON_FIRE: 'ON_FIRE',
  EXTINGUISHED: 'EXTINGUISHED',
  LAYING_DOWN: 'LAYING_DOWN',
};

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 14;
    this.height = 14;

    // Fire state
    this.fireState = FIRE_STATE.NOT_LIT;
    this.gel = GEL_MAX;
    this.fuel = FUEL_MAX;
    this.gelRate = GEL_DEPLETION_BASE;
    this.fuelRate = FUEL_DEPLETION_BASE;
    this.drainMultiplier = 1.0;

    // Movement
    this.dirX = 0;
    this.dirY = 0;
    this.facingX = 0;
    this.facingY = 1;
    this.speed = PLAYER_SPEED;
    this.inputLocked = false;

    // Animation
    this.animTimer = 0;
    this.animFrame = 0;
    this.isMoving = false;
    this.breatheTimer = 0;

    // Flare effect (on fuel pickup)
    this.flareTimer = 0;
    this.flareDuration = 1.5;

    // Lay down state
    this.layDownTimer = 0;

    // Scoring
    this.secondsOnFire = 0;
    this.extrasBurned = 0;
    this.onCameraTime = 0;
    this.totalTime = 0;
    this.timesFOVLeft = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    // Costume colors (set per level)
    this.costumeColor1 = '#cc4400';
    this.costumeColor2 = '#ffaa00';
    this.costumeAccent = '#ffffff';
  }

  ignite() {
    if (this.fireState === FIRE_STATE.NOT_LIT) {
      this.fireState = FIRE_STATE.ON_FIRE;
    }
  }

  extinguish() {
    this.fireState = FIRE_STATE.EXTINGUISHED;
  }

  layDown() {
    if (this.fireState !== FIRE_STATE.ON_FIRE || this.inputLocked) return false;
    this.fireState = FIRE_STATE.LAYING_DOWN;
    this.inputLocked = true;
    this.layDownTimer = 0;
    return true;
  }

  setDepletionRates(gelRate, fuelRate) {
    this.gelRate = gelRate;
    this.fuelRate = fuelRate;
  }

  addGel(amount) {
    this.gel = Math.min(GEL_MAX, this.gel + (amount || GEL_PICKUP_AMOUNT));
  }

  addFuel(amount) {
    this.fuel = Math.min(FUEL_MAX, this.fuel + (amount || FUEL_PICKUP_AMOUNT));
    this.flareTimer = this.flareDuration;
  }

  isOnFire() {
    return this.fireState === FIRE_STATE.ON_FIRE;
  }

  isLayingDown() {
    return this.fireState === FIRE_STATE.LAYING_DOWN;
  }

  getFlameIntensity() {
    if (!this.isOnFire()) return 0;
    const base = this.fuel / FUEL_MAX;
    if (this.flareTimer > 0) return Math.min(1.0, base * 2.0);
    return base;
  }

  update(dt, input, collisionSystem) {
    // Animation
    this.animTimer += dt;
    this.breatheTimer += dt;
    if (this.animTimer > 0.15) {
      this.animTimer -= 0.15;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Flare timer
    if (this.flareTimer > 0) {
      this.flareTimer -= dt;
    }

    // Lay down timer
    if (this.fireState === FIRE_STATE.LAYING_DOWN) {
      this.layDownTimer += dt;
    }

    // Movement
    this.isMoving = false;
    if (!this.inputLocked && input) {
      this.dirX = input.direction.x;
      this.dirY = input.direction.y;

      if (this.dirX !== 0 || this.dirY !== 0) {
        const n = normalize(this.dirX, this.dirY);
        const newX = this.x + n.x * this.speed * dt;
        const newY = this.y + n.y * this.speed * dt;

        const resolved = collisionSystem.resolveEntityTile(this, newX, newY);
        this.x = resolved.x;
        this.y = resolved.y;

        this.facingX = n.x;
        this.facingY = n.y;
        this.isMoving = true;
      }
    }

    // Fire depletion - burns 2x faster when standing still
    if (this.fireState === FIRE_STATE.ON_FIRE) {
      this.secondsOnFire += dt;
      this.totalTime += dt;

      const stillnessPenalty = this.isMoving ? 0.7 : 2.0;
      const multiplier = this.drainMultiplier * stillnessPenalty;
      this.gel -= this.gelRate * multiplier * dt;
      this.fuel -= this.fuelRate * multiplier * dt;

      this.gel = Math.max(0, this.gel);
      this.fuel = Math.max(0, this.fuel);

      // Reset drain multiplier each frame (set by proximity checks)
      this.drainMultiplier = 1.0;

      // Combo
      this.comboTimer += dt;
      if (this.comboTimer >= 3.0) {
        this.comboMultiplier = Math.min(3.0, this.comboMultiplier + 0.1);
        this.comboTimer = 0;
      }
    }
  }

  resetCombo() {
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    if (this.fireState === FIRE_STATE.LAYING_DOWN) {
      this._renderLayingDown(ctx, sx, sy);
      return;
    }

    this._renderStanding(ctx, sx, sy);
  }

  _renderLayingDown(ctx, sx, sy) {
    ctx.save();
    // Prone body
    const grad = ctx.createLinearGradient(sx, sy + 4, sx + this.width, sy + 12);
    grad.addColorStop(0, this.costumeColor1);
    grad.addColorStop(1, this._darkenColor(this.costumeColor1, 0.7));
    ctx.fillStyle = grad;
    this._roundRect(ctx, sx, sy + 4, this.width, 8, 2);

    // Head on ground
    ctx.fillStyle = '#f0c896';
    this._roundRect(ctx, sx + 2, sy + 5, 5, 5, 2);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + 7, sy + 13, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderStanding(ctx, sx, sy) {
    ctx.save();
    const breathe = Math.sin(this.breatheTimer * 2) * 0.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + 7, sy + 14, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with walk animation
    ctx.fillStyle = this._darkenColor(this.costumeColor1, 0.6);
    if (this.isMoving) {
      const legSwing = Math.sin(this.animTimer * 40) * 2;
      this._roundRect(ctx, sx + 3, sy + 11 + legSwing * 0.3, 3, 3, 1);
      this._roundRect(ctx, sx + 8, sy + 11 - legSwing * 0.3, 3, 3, 1);
    } else {
      this._roundRect(ctx, sx + 3, sy + 11, 3, 3, 1);
      this._roundRect(ctx, sx + 8, sy + 11, 3, 3, 1);
    }

    // Body with gradient
    const bodyGrad = ctx.createLinearGradient(sx + 2, sy + 4, sx + 12, sy + 12);
    bodyGrad.addColorStop(0, this.costumeColor1);
    bodyGrad.addColorStop(1, this._darkenColor(this.costumeColor1, 0.75));
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 2, sy + 4 + breathe, 10, 8, 2);

    // Costume accent stripe
    ctx.fillStyle = this.costumeAccent;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(sx + 3, sy + 5 + breathe, 8, 1);
    ctx.globalAlpha = 1;

    // Arms
    ctx.fillStyle = this.costumeColor1;
    if (this.isMoving) {
      const armSwing = Math.sin(this.animTimer * 40) * 1.5;
      ctx.fillRect(sx + 1, sy + 5 + breathe - armSwing * 0.3, 2, 5);
      ctx.fillRect(sx + 11, sy + 5 + breathe + armSwing * 0.3, 2, 5);
    } else {
      ctx.fillRect(sx + 1, sy + 5 + breathe, 2, 5);
      ctx.fillRect(sx + 11, sy + 5 + breathe, 2, 5);
    }

    // Head with skin gradient
    const headGrad = ctx.createRadialGradient(sx + 7, sy + 2, 0, sx + 7, sy + 2, 4);
    headGrad.addColorStop(0, '#f5d4a8');
    headGrad.addColorStop(1, '#e0b888');
    ctx.fillStyle = headGrad;
    this._roundRect(ctx, sx + 4, sy - 1, 6, 6, 2);

    // Eyes
    ctx.fillStyle = '#222';
    if (this.facingY < -0.3) {
      ctx.fillRect(sx + 5, sy, 1, 2);
      ctx.fillRect(sx + 8, sy, 1, 2);
    } else if (this.facingY > 0.3) {
      ctx.fillRect(sx + 5, sy + 3, 1, 2);
      ctx.fillRect(sx + 8, sy + 3, 1, 2);
    } else if (this.facingX < 0) {
      ctx.fillRect(sx + 4, sy + 1, 1, 2);
      ctx.fillRect(sx + 4, sy + 3, 1, 1);
    } else {
      ctx.fillRect(sx + 9, sy + 1, 1, 2);
      ctx.fillRect(sx + 9, sy + 3, 1, 1);
    }

    // Hair
    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + 4, sy - 2, 6, 2);

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
