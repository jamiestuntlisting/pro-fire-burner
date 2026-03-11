import { Entity } from '../engine/Entity.js';
import { TILE_SIZE } from '../constants.js';
import { pointInCone, distance } from '../utils/math.js';

export class FireSafety extends Entity {
  constructor(x, y, facingAngle) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    // Facing direction (angle in radians)
    this.facingAngle = facingAngle || 0;
    this.dirX = Math.cos(this.facingAngle);
    this.dirY = Math.sin(this.facingAngle);

    // Spray cone
    this.sprayRange = TILE_SIZE * 5;
    this.sprayHalfAngle = Math.PI / 6; // 30 degrees half angle = 60 total
    this.spraying = false;
    this.sprayParticleTimer = 0;

    // Movement toward player (when player lays down)
    this.moveToTarget = null;
    this.moveSpeed = PLAYER_SPEED * 2;
    this.arriving = false;
  }

  isPlayerInSpray(playerX, playerY) {
    return pointInCone(
      playerX, playerY,
      this.getCenterX(), this.getCenterY(),
      this.dirX, this.dirY,
      this.sprayRange, this.sprayHalfAngle
    );
  }

  moveToward(targetX, targetY) {
    this.moveToTarget = { x: targetX, y: targetY };
  }

  update(dt) {
    this.sprayParticleTimer += dt;

    if (this.moveToTarget) {
      const dx = this.moveToTarget.x - this.getCenterX();
      const dy = this.moveToTarget.y - this.getCenterY();
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 16) {
        this.arriving = true;
        this.moveToTarget = null;
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * this.moveSpeed * dt;
        this.y += ny * this.moveSpeed * dt;
      }
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Draw spray cone (semi-transparent)
    this._renderSprayCone(ctx, camera);

    // Body
    ctx.fillStyle = '#886644';
    ctx.fillRect(sx + 2, sy + 4, 12, 10);

    // Head
    ctx.fillStyle = '#eebb88';
    ctx.fillRect(sx + 4, sy, 8, 6);

    // Extinguisher (red cylinder on the side facing spray direction)
    ctx.fillStyle = '#cc0000';
    const extX = this.dirX > 0 ? sx + 12 : sx - 2;
    ctx.fillRect(extX, sy + 4, 4, 8);

    // Hard hat
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(sx + 3, sy - 1, 10, 3);
  }

  _renderSprayCone(ctx, camera) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const screen = camera.worldToScreen(cx, cy);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#aaddff';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);

    const angle1 = this.facingAngle - this.sprayHalfAngle;
    const angle2 = this.facingAngle + this.sprayHalfAngle;
    const range = this.sprayRange * camera.zoom;

    ctx.lineTo(
      screen.x + Math.cos(angle1) * range,
      screen.y + Math.sin(angle1) * range
    );
    ctx.lineTo(
      screen.x + Math.cos(angle2) * range,
      screen.y + Math.sin(angle2) * range
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
