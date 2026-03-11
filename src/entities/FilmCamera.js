import { Entity } from '../engine/Entity.js';
import { TILE_SIZE, FOV_GRACE_PERIOD, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import { pointInCone } from '../utils/math.js';

export class FilmCamera extends Entity {
  constructor(x, y, config) {
    super(x, y);
    this.width = 16;
    this.height = 16;

    this.panSpeed = (config && config.cameraPanSpeed) || 30;
    this.panDirection = 1;
    this.panMin = x - (config && config.panRange ? config.panRange : 100);
    this.panMax = x + (config && config.panRange ? config.panRange : 100);

    this.fovAngle = ((config && config.cameraFOV) || 70) * (Math.PI / 180);
    this.fovRange = TILE_SIZE * 15;
    this.facingAngle = Math.PI / 2;

    this.playerInFOV = true;
    this.offCameraTimer = 0;

    this.lensFlashTimer = 0;
    this.reelRotation = 0;
    this.recordingPulse = 0;
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
    this.x += this.panSpeed * this.panDirection * dt;
    if (this.x >= this.panMax) {
      this.x = this.panMax;
      this.panDirection = -1;
    } else if (this.x <= this.panMin) {
      this.x = this.panMin;
      this.panDirection = 1;
    }

    this.lensFlashTimer += dt;
    this.reelRotation += dt * 3;
    this.recordingPulse += dt;
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
    this._renderFOVCone(ctx, camera);

    const screen = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(screen.x);
    const sy = Math.floor(screen.y);

    ctx.save();

    // Tripod legs
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + 12);
    ctx.lineTo(sx + 1, sy + 16);
    ctx.moveTo(sx + 8, sy + 13);
    ctx.lineTo(sx + 8, sy + 16);
    ctx.moveTo(sx + 12, sy + 12);
    ctx.lineTo(sx + 15, sy + 16);
    ctx.stroke();

    // Tripod plate
    ctx.fillStyle = '#444444';
    this._roundRect(ctx, sx + 3, sy + 11, 10, 2, 1);

    // Camera body
    const bodyGrad = ctx.createLinearGradient(sx + 1, sy + 3, sx + 15, sy + 12);
    bodyGrad.addColorStop(0, '#2a2a2a');
    bodyGrad.addColorStop(0.3, '#3a3a3a');
    bodyGrad.addColorStop(0.7, '#252525');
    bodyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, sx + 1, sy + 3, 14, 9, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx + 2, sy + 3, 12, 1);

    // Lens
    const lensCx = sx + 8;
    const lensCy = sy + 7;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(lensCx, lensCy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const lensGrad = ctx.createRadialGradient(lensCx - 1, lensCy - 1, 0, lensCx, lensCy, 3.5);
    lensGrad.addColorStop(0, '#6688cc');
    lensGrad.addColorStop(0.3, '#4466aa');
    lensGrad.addColorStop(0.7, '#334488');
    lensGrad.addColorStop(1, '#223366');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(lensCx, lensCy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#556688';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(lensCx, lensCy, 2, 0, Math.PI * 2);
    ctx.stroke();

    if (Math.sin(this.lensFlashTimer * 2) > 0.8) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(lensCx - 1, lensCy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(lensCx - 1, lensCy - 1, 1, 0, Math.PI * 2);
    ctx.fill();

    // Recording light
    const recPulse = Math.sin(this.recordingPulse * 4) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,0,0,${recPulse})`;
    ctx.beginPath();
    ctx.arc(sx + 13, sy + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,0,0,${recPulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(sx + 13, sy + 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Film reel
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(sx + 3, sy + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const angle = this.reelRotation + (i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(sx + 3, sy + 2);
      ctx.lineTo(sx + 3 + Math.cos(angle) * 2.5, sy + 2 + Math.sin(angle) * 2.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(sx + 3, sy + 2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Viewfinder
    ctx.fillStyle = '#222222';
    this._roundRect(ctx, sx + 14, sy + 5, 3, 4, 1);
    ctx.fillStyle = '#334455';
    ctx.fillRect(sx + 15, sy + 6, 1, 2);

    ctx.restore();
  }

  _renderFOVCone(ctx, camera) {
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const screen = camera.worldToScreen(cx, cy);

    const angle1 = this.facingAngle - this.fovAngle / 2;
    const angle2 = this.facingAngle + this.fovAngle / 2;
    const range = this.fovRange * camera.zoom;
    const steps = 24;

    ctx.save();

    // Bright light inside the cone
    if (this.playerInFOV) {
      const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, range);
      grad.addColorStop(0, 'rgba(255,240,180,0.15)');
      grad.addColorStop(0.3, 'rgba(255,230,150,0.12)');
      grad.addColorStop(0.6, 'rgba(255,220,120,0.08)');
      grad.addColorStop(1, 'rgba(255,200,80,0.03)');
      ctx.fillStyle = grad;
    } else {
      const flash = Math.sin(this.lensFlashTimer * 8) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, range);
      grad.addColorStop(0, `rgba(255,80,80,${0.1 + flash * 0.1})`);
      grad.addColorStop(0.5, `rgba(255,50,50,${0.06 + flash * 0.06})`);
      grad.addColorStop(1, `rgba(255,30,30,${0.02})`);
      ctx.fillStyle = grad;
    }

    // Draw cone
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    for (let i = 0; i <= steps; i++) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(
        screen.x + Math.cos(a) * range,
        screen.y + Math.sin(a) * range
      );
    }
    ctx.closePath();
    ctx.fill();

    // Cone edge lines
    ctx.strokeStyle = this.playerInFOV ? 'rgba(255,220,100,0.3)' : 'rgba(255,80,80,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + Math.cos(angle1) * range, screen.y + Math.sin(angle1) * range);
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + Math.cos(angle2) * range, screen.y + Math.sin(angle2) * range);
    ctx.stroke();

    // Dark overlay OUTSIDE the cone
    const vw = VIEWPORT_WIDTH;
    const vh = VIEWPORT_HEIGHT;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vw, 0);
    ctx.lineTo(vw, vh);
    ctx.lineTo(0, vh);
    ctx.closePath();

    // Reverse-wind the cone to cut it out
    ctx.moveTo(screen.x, screen.y);
    for (let i = steps; i >= 0; i--) {
      const a = angle1 + (angle2 - angle1) * (i / steps);
      ctx.lineTo(
        screen.x + Math.cos(a) * range,
        screen.y + Math.sin(a) * range
      );
    }
    ctx.closePath();

    ctx.fillStyle = this.playerInFOV ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.25)';
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
}
