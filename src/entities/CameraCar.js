import { Entity } from '../engine/Entity.js';
import { PLAYER_SPEED } from '../constants.js';

export class CameraCar extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 28;
    this.height = 20;
    this.speed = PLAYER_SPEED * 0.85;
    this.targetDistance = 120;
    this.maxDistance = 300;
    this.active = false;
  }

  activate() {
    this.active = true;
  }

  update(dt, playerY) {
    if (!this.active) return;

    // Follow player (race levels scroll vertically typically, but we'll use Y distance)
    const distToPlayer = this.y - playerY;

    if (distToPlayer > this.targetDistance) {
      // Car is too far behind, speed up
      this.y -= this.speed * 1.3 * dt;
    } else if (distToPlayer < this.targetDistance * 0.5) {
      // Car is catching up, slow down slightly
      this.y -= this.speed * 0.7 * dt;
    } else {
      this.y -= this.speed * dt;
    }
  }

  hasReachedPlayer(playerY) {
    return this.active && Math.abs(this.y - playerY) < 16;
  }

  isPlayerTooFar(playerY) {
    return this.active && (this.y - playerY) > this.maxDistance;
  }

  render(ctx, camera) {
    if (!this.active) return;

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Car body
    ctx.fillStyle = '#333344';
    ctx.fillRect(sx + 2, sy + 2, 24, 16);

    // Windshield
    ctx.fillStyle = '#6688aa';
    ctx.fillRect(sx + 5, sy + 2, 18, 5);

    // Headlights
    ctx.fillStyle = '#ffff88';
    ctx.fillRect(sx + 3, sy, 4, 2);
    ctx.fillRect(sx + 21, sy, 4, 2);

    // Wheels
    ctx.fillStyle = '#111111';
    ctx.fillRect(sx, sy + 4, 3, 5);
    ctx.fillRect(sx + 25, sy + 4, 3, 5);
    ctx.fillRect(sx, sy + 12, 3, 5);
    ctx.fillRect(sx + 25, sy + 12, 3, 5);

    // Camera mount on top
    ctx.fillStyle = '#222222';
    ctx.fillRect(sx + 10, sy - 2, 8, 4);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(sx + 16, sy - 2, 2, 2);

    // Light beams
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffff88';
    ctx.beginPath();
    ctx.moveTo(sx + 5, sy);
    ctx.lineTo(sx - 5, sy - 30);
    ctx.lineTo(sx + 15, sy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 23, sy);
    ctx.lineTo(sx + 13, sy - 30);
    ctx.lineTo(sx + 33, sy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
