import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, PROPANE_DRAIN_AMOUNT } from '../constants.js';
import { distance } from '../utils/math.js';

export class PropaneCannon extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    this.fireInterval = 3.5; // seconds between bursts
    this.timer = Math.random() * this.fireInterval; // random initial offset
    this.warningDuration = 0.8;
    this.burstDuration = 0.4;
    this.burstRadius = TILE_SIZE * 3;

    this.state = 'IDLE'; // IDLE, WARNING, FIRING
    this.firingTimer = 0;

    this.burstHit = false;
  }

  update(dt) {
    this.timer += dt;

    switch (this.state) {
      case 'IDLE':
        if (this.timer >= this.fireInterval) {
          this.state = 'WARNING';
          this.firingTimer = 0;
          this.timer = 0;
        }
        break;

      case 'WARNING':
        this.firingTimer += dt;
        if (this.firingTimer >= this.warningDuration) {
          this.state = 'FIRING';
          this.firingTimer = 0;
          this.burstHit = false;
        }
        break;

      case 'FIRING':
        this.firingTimer += dt;
        if (this.firingTimer >= this.burstDuration) {
          this.state = 'IDLE';
          this.timer = 0;
        }
        break;
    }
  }

  isPlayerInBurst(playerX, playerY) {
    if (this.state !== 'FIRING' || this.burstHit) return false;
    const dist = distance(this.getCenterX(), this.getCenterY(), playerX, playerY);
    if (dist <= this.burstRadius) {
      this.burstHit = true;
      return true;
    }
    return false;
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Cannon body
    ctx.fillStyle = '#555555';
    ctx.fillRect(sx + 2, sy + 6, 12, 10);

    // Nozzle
    ctx.fillStyle = '#333333';
    ctx.fillRect(sx + 4, sy + 2, 8, 5);
    ctx.fillStyle = '#222222';
    ctx.fillRect(sx + 5, sy, 6, 3);

    // Warning indicator
    if (this.state === 'WARNING') {
      const flash = Math.sin(this.firingTimer * 20) > 0;
      if (flash) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff0000';
        const radius = this.burstRadius * camera.zoom;
        const cx = this.getCenterX();
        const cy = this.getCenterY();
        const sc = camera.worldToScreen(cx, cy);
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Firing burst
    if (this.state === 'FIRING') {
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - this.firingTimer / this.burstDuration);
      ctx.fillStyle = '#ff6600';
      const radius = this.burstRadius * camera.zoom;
      const cx = this.getCenterX();
      const cy = this.getCenterY();
      const sc = camera.worldToScreen(cx, cy);
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner burst
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Flame from nozzle
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(sx + 3, sy - 8, 10, 10);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(sx + 5, sy - 12, 6, 8);
    }

    // Indicator light
    ctx.fillStyle = this.state === 'IDLE' ? '#00aa00' : '#ff0000';
    ctx.fillRect(sx + 12, sy + 6, 2, 2);
  }
}
