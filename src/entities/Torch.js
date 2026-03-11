import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, TORCH_EFFECT_RADIUS, TORCH_DRAIN_MULTIPLIER } from '../constants.js';
import { distance } from '../utils/math.js';

export class Torch extends Entity {
  constructor(x, y) {
    super(x, y);
    this.width = 8;
    this.height = 16;
    this.effectRadius = TORCH_EFFECT_RADIUS * TILE_SIZE;
    this.drainMultiplier = TORCH_DRAIN_MULTIPLIER;
    this.flameTimer = 0;
    this.flameFrame = 0;
  }

  isPlayerNearby(playerX, playerY) {
    const dist = distance(this.getCenterX(), this.getCenterY(), playerX, playerY);
    return dist <= this.effectRadius;
  }

  update(dt) {
    this.flameTimer += dt;
    if (this.flameTimer > 0.1) {
      this.flameTimer -= 0.1;
      this.flameFrame = (this.flameFrame + 1) % 4;
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Pole/sconce
    ctx.fillStyle = '#665544';
    ctx.fillRect(sx + 2, sy + 6, 4, 10);

    // Base
    ctx.fillStyle = '#554433';
    ctx.fillRect(sx, sy + 14, 8, 2);

    // Bowl
    ctx.fillStyle = '#776655';
    ctx.fillRect(sx, sy + 4, 8, 3);

    // Flame (animated)
    const flameColors = ['#ff6600', '#ffaa00', '#ff4400', '#ffcc00'];
    const fc = flameColors[this.flameFrame];
    ctx.fillStyle = fc;
    ctx.fillRect(sx + 1, sy + 1, 6, 4);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(sx + 2, sy - 1, 4, 3);
    ctx.fillStyle = '#ffff88';
    ctx.fillRect(sx + 3, sy - 2 + (this.flameFrame % 2), 2, 2);

    // Danger zone glow (subtle)
    const radius = this.effectRadius * camera.zoom;
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const sc = camera.worldToScreen(cx, cy);
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
