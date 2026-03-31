import { Entity } from '../engine/Entity.js';
import {
  PLAYER_SPEED, GEL_MAX, FUEL_MAX, GEL_DEPLETION_BASE, FUEL_DEPLETION_BASE,
  GEL_PICKUP_AMOUNT, FUEL_PICKUP_AMOUNT, TILE_SIZE,
} from '../constants.js';
import { normalize } from '../utils/math.js';

export const FIRE_STATE = {
  NOT_LIT: 'NOT_LIT',
  LIGHTING_UP: 'LIGHTING_UP',
  ON_FIRE: 'ON_FIRE',
  EXTINGUISHED: 'EXTINGUISHED',
  LAYING_DOWN: 'LAYING_DOWN',
};

// Visual sprite height (for rendering offset)
const SPRITE_HEIGHT = 64;
const SPRITE_WIDTH = 28;

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    // Collision box = ground footprint only
    this.width = 24;
    this.height = 20;

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

    // Lighting-up animation
    this.lightUpTimer = 0;
    this.lightUpDuration = 1.8;

    this.secondsOnFire = 0;
    this.extrasBurned = 0;
    this.onCameraTime = 0;
    this.totalTime = 0;
    this.timesFOVLeft = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
  }

  startLightingUp() {
    if (this.fireState === FIRE_STATE.NOT_LIT) {
      this.fireState = FIRE_STATE.LIGHTING_UP;
      this.lightUpTimer = 0;
      this.inputLocked = true;
    }
  }

  ignite() {
    this.fireState = FIRE_STATE.ON_FIRE;
    this.inputLocked = false;
  }

  extinguish() { this.fireState = FIRE_STATE.EXTINGUISHED; }

  layDown() {
    if (this.fireState !== FIRE_STATE.ON_FIRE || this.inputLocked) return false;
    this.fireState = FIRE_STATE.LAYING_DOWN;
    this.inputLocked = true;
    this.layDownTimer = 0;
    return true;
  }

  isLightingUp() { return this.fireState === FIRE_STATE.LIGHTING_UP; }
  getLightUpProgress() { return Math.min(1, this.lightUpTimer / this.lightUpDuration); }

  setDepletionRates(gelRate, fuelRate) { this.gelRate = gelRate; this.fuelRate = fuelRate; }
  addGel(amount) { this.gel = Math.min(GEL_MAX, this.gel + (amount || GEL_PICKUP_AMOUNT)); }
  addFuel(amount) { this.fuel = Math.min(FUEL_MAX, this.fuel + (amount || FUEL_PICKUP_AMOUNT)); this.flareTimer = this.flareDuration; }
  isOnFire() { return this.fireState === FIRE_STATE.ON_FIRE; }
  isLayingDown() { return this.fireState === FIRE_STATE.LAYING_DOWN; }

  // Feet position for water/collision checks (center of collision box)
  getFeetX() { return this.x + this.width / 2; }
  getFeetY() { return this.y + this.height; }

  // Foot center = entity center (collision box IS the foot area now)
  getFootCenterX() { return this.getCenterX(); }
  getFootCenterY() { return this.getCenterY(); }

  // Visual offset: how far above the collision box to draw the sprite
  getSpriteOffsetY() { return -(SPRITE_HEIGHT - this.height) - 12; }

  getFlameIntensity() {
    if (this.fireState === FIRE_STATE.LIGHTING_UP) {
      return this.getLightUpProgress() * 0.5;
    }
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
    if (this.fireState === FIRE_STATE.LIGHTING_UP) this.lightUpTimer += dt;

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
      const stillnessPenalty = this.isMoving ? 0.7 : 4.0;
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
    // Draw sprite above the collision box (collision box is at feet level)
    const sx = Math.floor(screen.x) - (SPRITE_WIDTH - this.width) / 2;
    const sy = Math.floor(screen.y) + this.getSpriteOffsetY();
    if (this.fireState === FIRE_STATE.LAYING_DOWN) { this._renderLayingDown(ctx, sx, sy); return; }
    this._renderStanding(ctx, sx, sy);
  }

  _renderLayingDown(ctx, sx, sy) {
    ctx.save();
    const cx = sx + 14;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 54, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body lying flat
    const grad = ctx.createLinearGradient(sx - 8, sy + 30, sx + 40, sy + 48);
    grad.addColorStop(0, '#2a2a3a');
    grad.addColorStop(0.5, '#3a3a4a');
    grad.addColorStop(1, '#222233');
    ctx.fillStyle = grad;
    this._roundRect(ctx, sx - 8, sy + 32, 48, 14, 5);
    // Legs
    ctx.fillStyle = '#1e1e2e';
    this._roundRect(ctx, sx + 30, sy + 34, 20, 10, 3);
    // Head
    const hGrad = ctx.createRadialGradient(sx - 4, sy + 38, 0, sx - 4, sy + 38, 8);
    hGrad.addColorStop(0, '#4a4a5a');
    hGrad.addColorStop(1, '#333344');
    ctx.fillStyle = hGrad;
    this._roundRect(ctx, sx - 14, sy + 30, 14, 14, 6);
    // Visor
    ctx.fillStyle = '#2299aa';
    this._roundRect(ctx, sx - 12, sy + 34, 8, 5, 2);
    ctx.restore();
  }

  _renderStanding(ctx, sx, sy) {
    ctx.save();
    const cx = sx + 14;
    const b = Math.sin(this.breatheTimer * 2) * 1;
    const t = this.breatheTimer;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, sy + 64, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const ls = this.isMoving ? Math.sin(this.animTimer * 40) * 5 : 0;

    // === BOOTS - chunky armored boots ===
    ctx.fillStyle = '#111120';
    this._roundRect(ctx, sx + 1, sy + 56 + ls * 0.3, 9, 8, 3);
    this._roundRect(ctx, sx + 18, sy + 56 - ls * 0.3, 9, 8, 3);
    // Boot soles
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(sx, sy + 62 + ls * 0.3, 11, 2);
    ctx.fillRect(sx + 17, sy + 62 - ls * 0.3, 11, 2);
    // Boot trim
    ctx.fillStyle = '#cc6600';
    ctx.fillRect(sx + 1, sy + 56 + ls * 0.3, 9, 1.5);
    ctx.fillRect(sx + 18, sy + 56 - ls * 0.3, 9, 1.5);

    // === LEGS - athletic, armored ===
    const legG = ctx.createLinearGradient(sx + 2, sy + 40, sx + 26, sy + 57);
    legG.addColorStop(0, '#2e2e3e');
    legG.addColorStop(1, '#1e1e2e');
    ctx.fillStyle = legG;
    this._roundRect(ctx, sx + 2, sy + 40 + ls * 0.3, 8, 18, 3);
    this._roundRect(ctx, sx + 18, sy + 40 - ls * 0.3, 8, 18, 3);
    // Knee pads
    ctx.fillStyle = '#444455';
    this._roundRect(ctx, sx + 3, sy + 44 + ls * 0.3, 6, 5, 2);
    this._roundRect(ctx, sx + 19, sy + 44 - ls * 0.3, 6, 5, 2);

    // === TORSO - armored stunt suit ===
    const bodyG = ctx.createLinearGradient(sx, sy + 18, sx + 28, sy + 42);
    bodyG.addColorStop(0, '#3a3a4e');
    bodyG.addColorStop(0.3, '#474760');
    bodyG.addColorStop(0.7, '#3a3a4e');
    bodyG.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = bodyG;
    this._roundRect(ctx, sx, sy + 18 + b, 28, 24, 5);

    // Chest armor plate
    const chestG = ctx.createLinearGradient(sx + 4, sy + 20, sx + 24, sy + 34);
    chestG.addColorStop(0, '#505068');
    chestG.addColorStop(0.5, '#5a5a72');
    chestG.addColorStop(1, '#454558');
    ctx.fillStyle = chestG;
    this._roundRect(ctx, sx + 4, sy + 20 + b, 20, 14, 3);

    // Center line detail
    ctx.fillStyle = '#333344';
    ctx.fillRect(sx + 13, sy + 20 + b, 2, 14);

    // Orange accent stripes
    ctx.fillStyle = '#dd6600';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(sx + 2, sy + 24 + b, 24, 2);
    ctx.fillRect(sx + 2, sy + 34 + b, 24, 2);
    ctx.globalAlpha = 1;

    // Diagonal hazard stripe
    ctx.fillStyle = 'rgba(255,120,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + 26 + b);
    ctx.lineTo(sx + 24, sy + 22 + b);
    ctx.lineTo(sx + 24, sy + 24 + b);
    ctx.lineTo(sx + 4, sy + 28 + b);
    ctx.closePath();
    ctx.fill();

    // Belt / waist
    ctx.fillStyle = '#1a1a28';
    this._roundRect(ctx, sx + 1, sy + 38 + b, 26, 4, 2);
    // Belt buckle
    ctx.fillStyle = '#888877';
    this._roundRect(ctx, sx + 11, sy + 38 + b, 6, 4, 1);

    // === SHOULDER PADS - heroic, prominent ===
    const spG = ctx.createLinearGradient(sx - 4, sy + 17, sx + 6, sy + 27);
    spG.addColorStop(0, '#555570');
    spG.addColorStop(1, '#3a3a50');
    ctx.fillStyle = spG;
    this._roundRect(ctx, sx - 4, sy + 17 + b, 10, 10, 4);
    const spG2 = ctx.createLinearGradient(sx + 22, sy + 17, sx + 32, sy + 27);
    spG2.addColorStop(0, '#555570');
    spG2.addColorStop(1, '#3a3a50');
    ctx.fillStyle = spG2;
    this._roundRect(ctx, sx + 22, sy + 17 + b, 10, 10, 4);
    // Shoulder highlights
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, sx - 2, sy + 18 + b, 6, 3, 2);
    this._roundRect(ctx, sx + 24, sy + 18 + b, 6, 3, 2);
    // Shoulder accent
    ctx.fillStyle = '#cc6600';
    ctx.fillRect(sx - 3, sy + 25 + b, 8, 1.5);
    ctx.fillRect(sx + 23, sy + 25 + b, 8, 1.5);

    // === ARMS - muscular, armored ===
    const as = this.isMoving ? Math.sin(this.animTimer * 40) * 4 : 0;
    const armG = ctx.createLinearGradient(sx - 3, sy + 24, sx + 3, sy + 40);
    armG.addColorStop(0, '#3a3a4e');
    armG.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = armG;
    this._roundRect(ctx, sx - 3, sy + 24 + b - as * 0.3, 6, 16, 2);
    this._roundRect(ctx, sx + 25, sy + 24 + b + as * 0.3, 6, 16, 2);
    // Forearm armor
    ctx.fillStyle = '#444458';
    this._roundRect(ctx, sx - 2, sy + 30 + b - as * 0.3, 5, 6, 2);
    this._roundRect(ctx, sx + 25, sy + 30 + b + as * 0.3, 5, 6, 2);
    // Gloves
    ctx.fillStyle = '#1a1a28';
    this._roundRect(ctx, sx - 2, sy + 38 + b - as * 0.2, 5, 4, 2);
    this._roundRect(ctx, sx + 25, sy + 38 + b + as * 0.2, 5, 4, 2);

    // === NECK ===
    ctx.fillStyle = '#333348';
    ctx.fillRect(sx + 10, sy + 13 + b, 8, 6);
    // Neck guard
    ctx.fillStyle = '#2a2a3e';
    this._roundRect(ctx, sx + 8, sy + 15 + b, 12, 4, 2);

    // === HELMET - sci-fi stunt helmet ===
    const hG = ctx.createRadialGradient(cx, sy + 4, 2, cx, sy + 6, 14);
    hG.addColorStop(0, '#5a5a6e');
    hG.addColorStop(0.4, '#444458');
    hG.addColorStop(0.8, '#333348');
    hG.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = hG;
    this._roundRect(ctx, sx + 1, sy - 6, 26, 22, 8);

    // Helmet ridge / crest
    ctx.fillStyle = '#555570';
    this._roundRect(ctx, sx + 11, sy - 8, 6, 6, 3);
    // Ridge accent
    ctx.fillStyle = '#cc6600';
    ctx.fillRect(sx + 12, sy - 7, 4, 4);

    // === VISOR - large, iconic ===
    const vW = 20, vH = 10;
    if (this.facingY > 0.3) {
      // Facing down - full visor
      const vG = ctx.createLinearGradient(sx + 4, sy + 2, sx + 24, sy + 12);
      vG.addColorStop(0, '#0a4455');
      vG.addColorStop(0.2, '#1a8899');
      vG.addColorStop(0.4, '#33ccdd');
      vG.addColorStop(0.6, '#22aacc');
      vG.addColorStop(0.8, '#1a8899');
      vG.addColorStop(1, '#0a4455');
      ctx.fillStyle = vG;
      this._roundRect(ctx, sx + 4, sy + 2, vW, vH, 4);
      // Visor shine
      ctx.fillStyle = 'rgba(180,255,255,0.25)';
      this._roundRect(ctx, sx + 6, sy + 3, 8, 3, 2);
      // Visor border
      ctx.strokeStyle = '#666680';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy + 2);
      ctx.arcTo(sx + 24, sy + 2, sx + 24, sy + 12, 4);
      ctx.arcTo(sx + 24, sy + 12, sx + 4, sy + 12, 4);
      ctx.arcTo(sx + 4, sy + 12, sx + 4, sy + 2, 4);
      ctx.arcTo(sx + 4, sy + 2, sx + 24, sy + 2, 4);
      ctx.closePath();
      ctx.stroke();
    } else if (this.facingY < -0.3) {
      // Facing up - back of helmet
      ctx.fillStyle = '#383850';
      this._roundRect(ctx, sx + 4, sy + 2, vW, 6, 3);
      // Vent details
      ctx.fillStyle = '#2a2a3e';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(sx + 7 + i * 6, sy + 4, 4, 2);
      }
    } else {
      // Side view
      const vx = this.facingX < 0 ? sx + 2 : sx + 10;
      const vG = ctx.createLinearGradient(vx, sy + 2, vx + 16, sy + 10);
      vG.addColorStop(0, '#0a4455');
      vG.addColorStop(0.3, '#22aacc');
      vG.addColorStop(0.7, '#1a8899');
      vG.addColorStop(1, '#0a4455');
      ctx.fillStyle = vG;
      this._roundRect(ctx, vx, sy + 2, 16, vH, 4);
      ctx.fillStyle = 'rgba(180,255,255,0.2)';
      this._roundRect(ctx, vx + 2, sy + 3, 6, 3, 1);
    }

    // === HELMET LIGHT - status indicator ===
    const pulse = this.isOnFire() ? Math.sin(t * 6) * 0.3 + 0.7 :
                  this.isLightingUp() ? Math.sin(t * 12) * 0.4 + 0.5 : 0.2;
    // Glow
    ctx.fillStyle = `rgba(255,100,0,${pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, sy - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Light
    ctx.fillStyle = `rgba(255,130,0,${pulse})`;
    ctx.beginPath();
    ctx.arc(cx, sy - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Bright center
    ctx.fillStyle = `rgba(255,220,100,${pulse * 0.8})`;
    ctx.beginPath();
    ctx.arc(cx, sy - 4, 1, 0, Math.PI * 2);
    ctx.fill();

    // === LIGHTING UP EFFECT ===
    if (this.fireState === FIRE_STATE.LIGHTING_UP) {
      const progress = this.getLightUpProgress();
      // Torch in hand
      const torchX = sx + 26;
      const torchY = sy + 24 + b;
      ctx.fillStyle = '#554422';
      ctx.fillRect(torchX, torchY, 3, 14);
      // Torch flame (grows with progress)
      const fSize = 4 + progress * 10;
      const flicker = Math.sin(t * 15) * 2;
      ctx.fillStyle = `rgba(255,${Math.floor(100 + progress * 100)},0,${0.4 + progress * 0.5})`;
      ctx.beginPath();
      ctx.arc(torchX + 1.5, torchY - fSize * 0.5 + flicker, fSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,220,50,${0.3 + progress * 0.5})`;
      ctx.beginPath();
      ctx.arc(torchX + 1.5, torchY - fSize * 0.3 + flicker, fSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Fire spreading on body during later phases
      if (progress > 0.4) {
        const spread = (progress - 0.4) / 0.6;
        ctx.fillStyle = `rgba(255,100,0,${spread * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, sy + 20, 10 + spread * 15, 0, Math.PI * 2);
        ctx.fill();
      }
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
