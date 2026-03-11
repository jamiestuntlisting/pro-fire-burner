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
    this.width = 24;
    this.height = 48;

    this.fireState = FIRE_STATE.NOT_LIT;
    this.gel = GEL_MAX;
    this.fuel = FUEL_MAX;
    this.gelRate = GEL_DEPLETION_BASE;
    this.fuelRate = FUEL_DEPLETION_BASE;
    this.drainMultiplier = 1.0;

    this.dirX = 0;
    this.dirY = 0;
    this.facingX = 0;
    this.facingY = 1;
    this.speed = PLAYER_SPEED;
    this.inputLocked = false;

    this.animTimer = 0;
    this.animFrame = 0;
    this.isMoving = false;
    this.breatheTimer = 0;

    this.flareTimer = 0;
    this.flareDuration = 1.5;
    this.layDownTimer = 0;

    this.secondsOnFire = 0;
    this.extrasBurned = 0;
    this.onCameraTime = 0;
    this.totalTime = 0;
    this.timesFOVLeft = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    this.costumeColor1 = '#cc4400';
    this.costumeColor2 = '#ffaa00';
    this.costumeAccent = '#ffffff';
  }

  ignite() { if (this.fireState === FIRE_STATE.NOT_LIT) this.fireState = FIRE_STATE.ON_FIRE; }
  extinguish() { this.fireState = FIRE_STATE.EXTINGUISHED; }

  layDown() {
    if (this.fireState !== FIRE_STATE.ON_FIRE || this.inputLocked) return false;
    this.fireState = FIRE_STATE.LAYING_DOWN;
    this.inputLocked = true;
    this.layDownTimer = 0;
    return true;
  }

  setDepletionRates(gelRate, fuelRate) { this.gelRate = gelRate; this.fuelRate = fuelRate; }
  addGel(amount) { this.gel = Math.min(GEL_MAX, this.gel + (amount || GEL_PICKUP_AMOUNT)); }
  addFuel(amount) { this.fuel = Math.min(FUEL_MAX, this.fuel + (amount || FUEL_PICKUP_AMOUNT)); this.flareTimer = this.flareDuration; }
  isOnFire() { return this.fireState === FIRE_STATE.ON_FIRE; }
  isLayingDown() { return this.fireState === FIRE_STATE.LAYING_DOWN; }

  getFlameIntensity() {
    if (!this.isOnFire()) return 0;
    const base = this.fuel / FUEL_MAX;
    if (this.flareTimer > 0) return Math.min(1.0, base * 2.0);
    return base;
  }

  update(dt, input, collisionSystem) {
    this.animTimer += dt;
    this.breatheTimer += dt;
    if (this.animTimer > 0.15) { this.animTimer -= 0.15; this.animFrame = (this.animFrame + 1) % 4; }
    if (this.flareTimer > 0) this.flareTimer -= dt;
    if (this.fireState === FIRE_STATE.LAYING_DOWN) this.layDownTimer += dt;

    this.isMoving = false;
    if (!this.inputLocked && input) {
      this.dirX = input.direction.x;
      this.dirY = input.direction.y;
      if (this.dirX !== 0 || this.dirY !== 0) {
        const n = normalize(this.dirX, this.dirY);
        const resolved = collisionSystem.resolveEntityTile(this, this.x + n.x * this.speed * dt, this.y + n.y * this.speed * dt);
        this.x = resolved.x;
        this.y = resolved.y;
        this.facingX = n.x;
        this.facingY = n.y;
        this.isMoving = true;
      }
    }

    if (this.fireState === FIRE_STATE.ON_FIRE) {
      this.secondsOnFire += dt;
      this.totalTime += dt;
      const stillnessPenalty = this.isMoving ? 0.7 : 2.0;
      const multiplier = this.drainMultiplier * stillnessPenalty;
      this.gel -= this.gelRate * multiplier * dt;
      this.fuel -= this.fuelRate * multiplier * dt;
      this.gel = Math.max(0, this.gel);
      this.fuel = Math.max(0, this.fuel);
      this.drainMultiplier = 1.0;
      this.comboTimer += dt;
      if (this.comboTimer >= 3.0) { this.comboMultiplier = Math.min(3.0, this.comboMultiplier + 0.1); this.comboTimer = 0; }
    }
  }

  resetCombo() { this.comboMultiplier = 1.0; this.comboTimer = 0; }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);
    if (this.fireState === FIRE_STATE.LAYING_DOWN) { this._renderLayingDown(ctx, sx, sy); return; }
    this._renderStanding(ctx, sx, sy);
  }

  _renderLayingDown(ctx, sx, sy) {
    ctx.save();
    const cx = sx + 12;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 38, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body lying flat
    const grad = ctx.createLinearGradient(sx - 6, sy + 20, sx + 30, sy + 34);
    grad.addColorStop(0, '#3a3a4a');
    grad.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = grad;
    this._roundRect(ctx, sx - 6, sy + 22, 36, 12, 4);
    // Head
    ctx.fillStyle = '#4a4a5a';
    this._roundRect(ctx, sx - 8, sy + 24, 10, 10, 4);
    // Visor
    ctx.fillStyle = '#2299aa';
    this._roundRect(ctx, sx - 6, sy + 27, 6, 4, 2);
    ctx.restore();
  }

  _renderStanding(ctx, sx, sy) {
    ctx.save();
    const cx = sx + 12;
    const b = Math.sin(this.breatheTimer * 2) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 48, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const ls = this.isMoving ? Math.sin(this.animTimer * 40) * 4 : 0;

    // Boots
    ctx.fillStyle = '#1a1a2a';
    this._roundRect(ctx, sx + 2, sy + 41 + ls * 0.3, 7, 6, 2);
    this._roundRect(ctx, sx + 15, sy + 41 - ls * 0.3, 7, 6, 2);

    // Legs - slim
    const legG = ctx.createLinearGradient(sx + 3, sy + 30, sx + 21, sy + 42);
    legG.addColorStop(0, '#3a3a4a');
    legG.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = legG;
    this._roundRect(ctx, sx + 3, sy + 30 + ls * 0.3, 6, 13, 2);
    this._roundRect(ctx, sx + 15, sy + 30 - ls * 0.3, 6, 13, 2);

    // Torso - slim power suit
    const bodyG = ctx.createLinearGradient(sx + 1, sy + 14, sx + 23, sy + 32);
    bodyG.addColorStop(0, '#444455');
    bodyG.addColorStop(0.4, '#555566');
    bodyG.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = bodyG;
    this._roundRect(ctx, sx + 1, sy + 14 + b, 22, 18, 4);

    // Chest plate
    ctx.fillStyle = '#555566';
    this._roundRect(ctx, sx + 4, sy + 16 + b, 16, 10, 2);

    // Orange accent stripes
    ctx.fillStyle = '#cc6600';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(sx + 3, sy + 18 + b, 18, 1.5);
    ctx.fillRect(sx + 3, sy + 24 + b, 18, 1.5);
    ctx.globalAlpha = 1;

    // Shoulder pads - small
    ctx.fillStyle = '#4a4a5a';
    this._roundRect(ctx, sx - 2, sy + 14 + b, 6, 7, 3);
    this._roundRect(ctx, sx + 20, sy + 14 + b, 6, 7, 3);

    // Arms - slim
    const as = this.isMoving ? Math.sin(this.animTimer * 40) * 3 : 0;
    ctx.fillStyle = '#3a3a4a';
    this._roundRect(ctx, sx - 1, sy + 18 + b - as * 0.3, 4, 12, 1);
    this._roundRect(ctx, sx + 21, sy + 18 + b + as * 0.3, 4, 12, 1);
    // Gloves
    ctx.fillStyle = '#1a1a2a';
    this._roundRect(ctx, sx - 1, sy + 28 + b, 4, 3, 1);
    this._roundRect(ctx, sx + 21, sy + 28 + b, 4, 3, 1);

    // Neck
    ctx.fillStyle = '#333344';
    ctx.fillRect(sx + 9, sy + 10 + b, 6, 5);

    // Helmet - proportional
    const hG = ctx.createRadialGradient(cx, sy + 4, 1, cx, sy + 5, 10);
    hG.addColorStop(0, '#5a5a6a');
    hG.addColorStop(0.6, '#3e3e4e');
    hG.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = hG;
    this._roundRect(ctx, sx + 2, sy - 4, 20, 16, 6);

    // Visor
    const vG = ctx.createLinearGradient(sx + 4, sy + 1, sx + 20, sy + 8);
    vG.addColorStop(0, '#115566');
    vG.addColorStop(0.3, '#2299aa');
    vG.addColorStop(0.5, '#33bbcc');
    vG.addColorStop(0.7, '#2299aa');
    vG.addColorStop(1, '#115566');
    ctx.fillStyle = vG;
    if (this.facingY > 0.3) {
      this._roundRect(ctx, sx + 5, sy + 2, 14, 6, 3);
      ctx.fillStyle = 'rgba(150,255,255,0.3)';
      this._roundRect(ctx, sx + 6, sy + 3, 6, 2, 1);
    } else if (this.facingY < -0.3) {
      ctx.fillStyle = '#3a3a4a';
      this._roundRect(ctx, sx + 5, sy + 1, 14, 4, 3);
    } else {
      const vx = this.facingX < 0 ? sx + 3 : sx + 9;
      this._roundRect(ctx, vx, sy + 2, 12, 6, 3);
      ctx.fillStyle = 'rgba(150,255,255,0.3)';
      this._roundRect(ctx, vx + 2, sy + 3, 4, 2, 1);
    }

    // Helmet light
    const pulse = this.isOnFire() ? Math.sin(this.breatheTimer * 4) * 0.3 + 0.7 : 0.3;
    ctx.fillStyle = `rgba(255,120,0,${pulse})`;
    ctx.beginPath();
    ctx.arc(cx, sy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,120,0,${pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, sy - 2, 4, 0, Math.PI * 2);
    ctx.fill();

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
