import { Entity } from '../engine/Entity.js';

export const PICKUP_TYPE = {
  GEL: 'GEL',
  FUEL: 'FUEL',
};

export class Pickup extends Entity {
  constructor(x, y, type) {
    super(x, y);
    this.type = type;
    this.width = 12;
    this.height = 12;
    this.pulseTimer = Math.random() * Math.PI * 2; // random phase
    this.collected = false;
  }

  update(dt) {
    this.pulseTimer += dt * 3;
  }

  collect() {
    this.collected = true;
    this.dead = true;
  }

  render(ctx, camera) {
    if (this.dead) return;
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    const pulse = Math.sin(this.pulseTimer) * 0.3 + 0.7;

    if (this.type === PICKUP_TYPE.GEL) {
      // Blue glowing bottle
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#2266ff';
      ctx.fillRect(sx + 2, sy + 3, 8, 8);
      ctx.fillStyle = '#44aaff';
      ctx.fillRect(sx + 4, sy + 1, 4, 3);
      // Sparkle
      ctx.fillStyle = '#aaddff';
      ctx.fillRect(sx + 3, sy + 5, 2, 2);
      ctx.globalAlpha = 1;
    } else {
      // Red/orange fuel canister
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#cc4400';
      ctx.fillRect(sx + 2, sy + 3, 8, 8);
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(sx + 4, sy + 1, 4, 3);
      // Flame icon
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx + 5, sy + 5, 2, 3);
      ctx.fillRect(sx + 4, sy + 6, 4, 2);
      ctx.globalAlpha = 1;
    }
  }
}
