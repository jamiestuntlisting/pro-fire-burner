import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, FOV_GRACE_PERIOD } from '../constants.js';
import { pointInCone } from '../utils/math.js';

export class FilmCamera extends Entity {
  constructor(x, y, config) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    // Panning
    this.panSpeed = (config && config.cameraPanSpeed) || 30;
    this.panDirection = 1;
    this.panMin = x - (config && config.panRange ? config.panRange : 100);
    this.panMax = x + (config && config.panRange ? config.panRange : 100);

    // FOV
    this.fovAngle = ((config && config.cameraFOV) || 70) * (Math.PI / 180);
    this.fovRange = TILE_SIZE * 15;
    this.facingAngle = Math.PI / 2; // Initially facing down

    // Player tracking
    this.playerInFOV = true;
    this.offCameraTimer = 0;

    // Animation
    this.lensFlashTimer = 0;
  }

  setPanBounds(min, max) {
    this.panMin = min;
    this.panMax = max;
  }

  isPlayerInFOV(playerX, playerY) {
    return pointInCone(
      playerX, playerY,
      this.getCenterX(), this.getCenterY(),
      Math.cos(this.facingAngle), Math.sin(this.facingAngle),
      this.fovRange, this.fovAngle / 2
    );
  }

  update(dt) {
    // Pan left-right
    this.x += this.panSpeed * this.panDirection * dt;
    if (this.x >= this.panMax) {
      this.x = this.panMax;
      this.panDirection = -1;
    } else if (this.x <= this.panMin) {
      this.x = this.panMin;
      this.panDirection = 1;
    }

    // Update facing angle based on pan direction
    // Camera always roughly faces the center of the map
    this.lensFlashTimer += dt;
  }

  updatePlayerTracking(playerX, playerY, dt) {
    this.playerInFOV = this.isPlayerInFOV(playerX, playerY);

    if (!this.playerInFOV) {
      this.offCameraTimer += dt;
    } else {
      this.offCameraTimer = 0;
    }

    return this.offCameraTimer >= FOV_GRACE_PERIOD;
  }

  getOnCameraPercent(totalTime) {
    if (totalTime <= 0) return 1;
    return Math.max(0, 1 - (this.offCameraTimer / totalTime));
  }

  render(ctx, camera) {
    // Draw FOV cone first (behind camera)
    this._renderFOVCone(ctx, camera);

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    // Camera body (tripod base)
    ctx.fillStyle = '#333333';
    ctx.fillRect(sx + 2, sy + 10, 12, 4);

    // Tripod legs
    ctx.fillStyle = '#555555';
    ctx.fillRect(sx + 3, sy + 13, 2, 3);
    ctx.fillRect(sx + 7, sy + 14, 2, 2);
    ctx.fillRect(sx + 11, sy + 13, 2, 3);

    // Camera body
    ctx.fillStyle = '#222222';
    ctx.fillRect(sx + 1, sy + 3, 14, 8);

    // Lens
    ctx.fillStyle = '#4466aa';
    ctx.fillRect(sx + 5, sy + 5, 6, 4);

    // Lens flash
    if (Math.sin(this.lensFlashTimer * 2) > 0.8) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 6, sy + 6, 2, 2);
    }

    // Red recording light
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(sx + 12, sy + 4, 2, 2);

    // Film reel
    ctx.fillStyle = '#444444';
    ctx.fillRect(sx + 0, sy + 1, 5, 4);
  }

  _renderFOVCone(ctx, camera) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const screen = camera.worldToScreen(cx, cy);

    ctx.save();
    ctx.globalAlpha = this.playerInFOV ? 0.08 : 0.15;
    ctx.fillStyle = this.playerInFOV ? '#ffff88' : '#ff4444';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);

    const angle1 = this.facingAngle - this.fovAngle / 2;
    const angle2 = this.facingAngle + this.fovAngle / 2;
    const range = this.fovRange * camera.zoom;

    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(
        screen.x + Math.cos(a) * range,
        screen.y + Math.sin(a) * range
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
