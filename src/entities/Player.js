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

    // Fire depletion
    if (this.fireState === FIRE_STATE.ON_FIRE) {
      this.secondsOnFire += dt;
      this.totalTime += dt;

      const multiplier = this.drainMultiplier;
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
      // Face-down sprite (wider, shorter)
      ctx.fillStyle = this.costumeColor1;
      ctx.fillRect(sx, sy + 4, this.width, 8);
      ctx.fillStyle = this.costumeColor2;
      ctx.fillRect(sx + 2, sy + 5, 4, 6); // head
      return;
    }

    // Body
    ctx.fillStyle = this.costumeColor1;
    ctx.fillRect(sx + 2, sy + 4, 10, 10);

    // Head
    ctx.fillStyle = this.costumeColor2;
    ctx.fillRect(sx + 4, sy, 6, 6);

    // Direction indicator (eyes/face)
    ctx.fillStyle = '#000';
    if (this.facingY < -0.3) {
      // Up
      ctx.fillRect(sx + 5, sy + 1, 1, 1);
      ctx.fillRect(sx + 8, sy + 1, 1, 1);
    } else if (this.facingY > 0.3) {
      // Down
      ctx.fillRect(sx + 5, sy + 3, 1, 1);
      ctx.fillRect(sx + 8, sy + 3, 1, 1);
    } else if (this.facingX < 0) {
      // Left
      ctx.fillRect(sx + 4, sy + 2, 1, 1);
      ctx.fillRect(sx + 4, sy + 4, 1, 1);
    } else {
      // Right
      ctx.fillRect(sx + 9, sy + 2, 1, 1);
      ctx.fillRect(sx + 9, sy + 4, 1, 1);
    }

    // Walk animation (leg movement)
    if (this.isMoving) {
      ctx.fillStyle = this.costumeColor1;
      const legOffset = this.animFrame < 2 ? 1 : -1;
      ctx.fillRect(sx + 3, sy + 12, 3, 2);
      ctx.fillRect(sx + 8 + legOffset, sy + 12, 3, 2);
    } else {
      ctx.fillStyle = this.costumeColor1;
      ctx.fillRect(sx + 3, sy + 12, 3, 2);
      ctx.fillRect(sx + 8, sy + 12, 3, 2);
    }

    // Costume accent
    ctx.fillStyle = this.costumeAccent;
    ctx.fillRect(sx + 3, sy + 4, 8, 1);
  }
}
